import { ARENA_SIZE, deriveStepEvents, headingToRadians, isOutsideSafeZone } from './battle-state.js';
import { Arena } from './arena.js';
import { BattleAudioManager } from './audio-manager.js';
import { BattleCameraController } from './camera-controller.js';
import { BattleHud } from './hud.js';
import { BattleEffects } from './effects.js';
import { Fighter } from './fighter.js';
import { sampleSkinColors } from './palette.js';
import { ResourceTracker } from './resource-tracker.js';

const SEEK_SECONDS = 0.45;
const DEFAULT_SEGMENT_MS = 100;
const MIN_SEGMENT_MS = 16;
const MAX_SEGMENT_MS = 400;
const MAX_FRAME_DELTA = 0.1;
/** Adaptive resolution: sampled over `QUALITY_WINDOW_MS`, stepping the pixel ratio within these bounds. */
const QUALITY_WINDOW_MS = 700;
const SLOW_FRAME_MS = 21;
const FAST_FRAME_MS = 17.6;
const MIN_PIXEL_RATIO = 0.7;
const PIXEL_RATIO_STEP = 0.15;
const RAISE_AFTER_WINDOWS = 6;
const SHAKE_DECAY_PER_SECOND = 1.9;
const SHAKE_MAX_OFFSET = 0.3;

/** Engine heading (degrees, 0 = north, clockwise) to the rig's yaw; the rig faces +Z. */
const headingToYaw = (heading) => Math.PI + headingToRadians(heading);

/** Dusk gradient behind the stands, fading into the fog colour at the horizon. */
function createSkyTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#3f5a7a');
    gradient.addColorStop(0.55, '#7d8a94');
    gradient.addColorStop(0.8, '#a5927a');
    gradient.addColorStop(1, '#1d242b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Three.js top-down battle renderer.
 *
 * The shared playback timer hands over one complete frame every 100 ms / speed.
 * Each arrival starts a short interpolation segment from wherever the fighters
 * currently are toward the new frame, so motion stays continuous whatever the timer
 * jitter, and seeks/paused stepping simply snap. Animation clocks (gait phase, swing
 * timing) run on a "game clock" that follows replay speed and stops while paused.
 */
export class BattleRenderer {
    #THREE;
    #container;
    #renderer;
    #scene;
    #camera;
    #controls;
    #overlay;
    #arena;
    #effects;
    #audio;
    #tracker;
    #resizeObserver;
    #reducedMotion;
    #fighters = [];
    #skinColors = new Map();
    #fightersById = new Map();
    #applied = null;
    #lastArrival = 0;
    #segmentMs = DEFAULT_SEGMENT_MS;
    #segmentStart = 0;
    #lastTimestamp = null;
    #lastSize = { width: 0, height: 0 };
    #shakeTrauma = 0;
    #ready = false;
    #fpsFrames = 0;
    #fpsStartedAt = performance.now();
    #shadowTexture;
    #maxPixelRatio = 1;
    #pixelRatio = 1;
    #qualityFrames = 0;
    #qualityStartedAt = 0;
    #fastWindows = 0;
    #raiseBackoff = RAISE_AFTER_WINDOWS;

    /**
     * @param {{ THREE: typeof import('three'), container: HTMLElement }} options Renderer dependencies.
     */
    constructor({ THREE, container }) {
        this.#THREE = THREE;
        this.#container = container;
        this.#tracker = new ResourceTracker(THREE);
        this.#audio = new BattleAudioManager();
        this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // MSAA on a dense display costs a lot of fill rate for little visible gain
        const density = window.devicePixelRatio || 1;
        this.#renderer = new THREE.WebGLRenderer({ antialias: density < 1.5, powerPreference: 'high-performance' });
        this.#maxPixelRatio = Math.min(density, 2);
        this.#pixelRatio = this.#maxPixelRatio;
        this.#renderer.setPixelRatio(this.#pixelRatio);
        this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.#renderer.domElement.id = 'battle-render2-canvas';
        this.#renderer.domElement.tabIndex = 0;
        this.#renderer.domElement.setAttribute('aria-label', 'Arena 3D da batalha');
        container.appendChild(this.#renderer.domElement);

        this.#scene = new THREE.Scene();
        this.#scene.background = this.#tracker.track(createSkyTexture(THREE));
        this.#scene.fog = new THREE.Fog(0x1d242b, 45, 85);
        this.#buildLights();
        this.#camera = new THREE.PerspectiveCamera(45, 1, 1, 160);
        this.#arena = new Arena({ THREE, scene: this.#scene });
        this.#effects = new BattleEffects({ THREE, scene: this.#scene, audio: this.#audio, onShake: (trauma) => this.addShake(trauma) });
        this.#controls = new BattleCameraController({ THREE, camera: this.#camera, canvas: this.#renderer.domElement });
        this.#overlay = new BattleHud({
            THREE,
            canvas: this.#renderer.domElement,
            camera: this.#camera,
            onSelect: (index) => this.#selectFighter(index),
            isFollowed: (fighter) => this.#controls.target === fighter.root,
            isPoisoned: (fighter) => Boolean(window.gladArray?.[fighter.index]?.poison) && fighter.state && Number(fighter.state.hp) > 0,
        });
        this.#shadowTexture = this.#createShadowTexture();

        this.music = this.#audio.create('music', { loop: true, volume: Number(window.prefs?.sound?.music) || 0 });
        this.ending = this.#audio.create('ending');
        this.victory = this.#audio.create('victory');

        this.#resizeObserver = new ResizeObserver(() => this.resize());
        this.#resizeObserver.observe(container);
        this.resize();
        this.#renderer.setAnimationLoop(this.#animate);
    }

    /** @type {import('./audio-manager.js').AudioTrack} */
    music;

    /** @type {import('./audio-manager.js').AudioTrack} */
    ending;

    /** @type {import('./audio-manager.js').AudioTrack} */
    victory;

    /** @returns {Fighter[]} Fighters in roster order (exposed for diagnostics). */
    /**
     * Toggles camera follow and the details window for a fighter picked on the HUD roster.
     * @param {number} index Fighter index.
     */
    #selectFighter(index) {
        const fighter = this.#fighters[index];
        if (!fighter) return;
        if (window.followedGlad === index || this.#controls.target === fighter.root) {
            window.followedGlad = null;
            this.#controls.unfollow();
            window.jQuery?.('#details').remove();
            return;
        }
        window.followedGlad = index;
        this.#controls.follow(fighter.root);
        window.createDetailedWindow?.();
    }

    /**
     * Samples the original sprite colors of every skin so the models match the roster.
     * @param {Array<Record<string, unknown>>} gladiators First replay frame gladiators.
     */
    async prepare(gladiators) {
        this.#skinColors = await sampleSkinColors(gladiators.map((gladiator) => gladiator.skin));
    }

    get fighters() {
        return this.#fighters;
    }

    #buildLights() {
        const THREE = this.#THREE;
        this.#scene.add(this.#tracker.track(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.25)));
        const sun = this.#tracker.track(new THREE.DirectionalLight(0xfff0d8, 1.9));
        sun.position.set(-10, 22, 12);
        this.#scene.add(sun);
        const fill = this.#tracker.track(new THREE.DirectionalLight(0x9cc8ff, 0.45));
        fill.position.set(12, 8, -10);
        this.#scene.add(fill);
    }

    /** Soft radial blob used as a cheap contact shadow under every fighter. */
    #createShadowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
        gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return this.#tracker.track(new this.#THREE.CanvasTexture(canvas));
    }

    #createFighters(gladiators) {
        gladiators.forEach((gladiator, index) => {
            const fighter = new Fighter({ THREE: this.#THREE, gladiator, index, shadowTexture: this.#shadowTexture, colors: this.#skinColors });
            this.#scene.add(fighter.root);
            this.#fighters.push(fighter);
            this.#fightersById.set(String(gladiator.id ?? index), fighter);
            window.sprite ??= [];
            window.sprite[index] = fighter.root;
            window.gladArray ??= [];
            window.gladArray[index] = { alive: Number(gladiator.hp) > 0, hp: Number(gladiator.hp), level: Number(gladiator.lvl), poison: false, sprites: {} };
        });
    }

    // ---------------------------------------------------------------- replay input

    /**
     * Receives one complete replay frame from the shared playback timer.
     *
     * @param {Record<string, unknown>} state Complete expanded simlog frame.
     */
    update(state) {
        const gladiators = Array.isArray(state.glads) ? state.glads : [];
        if (!gladiators.length) return;
        if (!this.#fighters.length) this.#createFighters(gladiators);

        const simulationTime = Number(state.simtime) || 0;
        if (!this.#applied) {
            this.#applyFrame(state, null, true);
        }
        else {
            const gap = simulationTime - Number(this.#applied.simtime);
            if (gap === 0) return;
            const continuous = Math.abs(gap) <= SEEK_SECONDS && !window.pausesim;
            this.#applyFrame(state, continuous ? this.#applied : null, !continuous);
        }
        this.#showBattleWhenReady();
    }

    /**
     * Makes a frame current: legacy UI, one-shot events, then new interpolation targets.
     *
     * @param {Record<string, unknown>} state Frame to apply.
     * @param {Record<string, unknown>|null} previous Frame before it when playing continuously.
     * @param {boolean} snap Jump instead of interpolating (first frame, seek, paused stepping).
     */
    #applyFrame(state, previous, snap) {
        const gladiators = state.glads;
        const safeRadius = Number(state.poison);
        const now = performance.now();
        if (previous) {
            const measured = now - this.#lastArrival;
            this.#segmentMs = Math.min(MAX_SEGMENT_MS, Math.max(MIN_SEGMENT_MS, (this.#segmentMs + measured) / 2));
        }
        this.#lastArrival = now;
        this.#segmentStart = now;

        this.#pauseAtNewBreakpoints(previous, state);
        window.update_ui?.(state);
        this.#updateLegacyTimeSlider(state);
        this.#arena.updateSafeZone(safeRadius);

        const forward = previous && Number(state.simtime) > Number(previous.simtime);
        if (forward) {
            gladiators.forEach((gladiator, index) => {
                if (Number(gladiator.action) !== Number(previous.glads[index]?.action)) this.#fighters[index]?.startAction(Number(gladiator.action));
            });
            this.#effects.handleEvents(deriveStepEvents(previous, state), this.#fightersById, this.#overlay, window.prefs ?? {}, state);
        }
        else {
            this.#effects.clear();
            this.#fighters.forEach((fighter) => fighter.reset());
        }

        gladiators.forEach((gladiator, index) => {
            const fighter = this.#fighters[index];
            if (!fighter) return;
            fighter.setTarget(
                gladiator,
                { x: Number(gladiator.x) - ARENA_SIZE / 2, z: Number(gladiator.y) - ARENA_SIZE / 2 },
                headingToYaw(gladiator.head),
                snap,
            );
            fighter.setAlive(Number(gladiator.hp) > 0);
            const compatibility = window.gladArray[index] ?? {};
            compatibility.alive = Number(gladiator.hp) > 0;
            compatibility.hp = Number(gladiator.hp);
            compatibility.level = Number(gladiator.lvl);
            compatibility.poison = isOutsideSafeZone(gladiator, safeRadius);
            window.gladArray[index] = compatibility;
        });
        this.#effects.setProjectiles(Array.isArray(state.projectiles) ? state.projectiles : [], snap);
        this.#applied = state;
    }

    /** Pauses playback when a newly emitted breakpoint reaches the renderer. */
    #pauseAtNewBreakpoints(previous, current) {
        if (!previous) return;
        const hasNew = current.glads.some((gladiator, index) => {
            const breakpoint = typeof gladiator.breakpoint === 'string' ? gladiator.breakpoint : '';
            return breakpoint && breakpoint !== previous.glads[index]?.breakpoint && Number(gladiator.hp) > 0;
        });
        if (hasNew && !window.pausesim) document.querySelector('#pause')?.click();
    }

    /** Keeps the shared jQuery UI timeline in sync with the replay clock. */
    #updateLegacyTimeSlider(state) {
        const simtime = Number(state.simtime);
        if (window.timeSlider === Math.floor(simtime) || !window.jQuery?.fn?.slider) return;
        window.timeSlider = simtime;
        window.jQuery('#time').slider('value', simtime * 10);
    }

    /** Removes the loader and starts the shared replay state once WebGL is ready. */
    #showBattleWhenReady() {
        if (this.#ready) return;
        this.#ready = true;
        document.querySelector('#fog')?.remove();
        this.#container.closest('#canvas-container')?.classList.add('is-ready');
        window.pausesim = false;
        this.music.volume = Number(window.prefs?.sound?.music) || 0;
        this.music.play();
        this.#renderer.domElement.focus({ preventScroll: true });
    }

    // ------------------------------------------------------------------ frame loop

    /**
     * Adds camera trauma; the offset decays exponentially.
     *
     * @param {number} trauma Shake strength from zero to one.
     */
    addShake(trauma) {
        if (this.#reducedMotion) return;
        this.#shakeTrauma = Math.min(1, this.#shakeTrauma + (Number(trauma) || 0));
    }

    #animate = (timestamp) => {
        const realDt = this.#lastTimestamp === null ? 1 / 60 : Math.min((timestamp - this.#lastTimestamp) / 1000, MAX_FRAME_DELTA);
        this.#lastTimestamp = timestamp;
        const elapsed = timestamp / 1000;
        const rate = window.pausesim ? 0 : Math.abs(Number(window.stepIncrement) || 1);
        const gameDt = realDt * rate;
        const progress = Math.min(1, (performance.now() - this.#segmentStart) / this.#segmentMs);

        this.#controls.update();
        if (this.#shakeTrauma > 0) {
            this.#shakeTrauma = Math.max(0, this.#shakeTrauma - SHAKE_DECAY_PER_SECOND * realDt);
            const magnitude = this.#shakeTrauma ** 2 * SHAKE_MAX_OFFSET;
            this.#camera.position.x += Math.sin(elapsed * 31.7) * magnitude;
            this.#camera.position.z += Math.cos(elapsed * 27.3) * magnitude;
        }

        this.#arena.animate(this.#reducedMotion ? 0 : elapsed);
        const frame = { realDt, gameDt, progress, elapsed, reducedMotion: this.#reducedMotion };
        for (const fighter of this.#fighters) fighter.update(frame);
        this.#effects.update(frame);
        this.#renderer.render(this.#scene, this.#camera);
        this.#overlay.update(this.#fighters, window.prefs ?? {}, realDt);
        this.#overlay.render(this.#renderer);
        this.#updateFps(timestamp);
        this.#adaptResolution(timestamp);
    };

    /**
     * Trades resolution for fluidity: drops the pixel ratio when frames run long and
     * cautiously raises it again after a stretch of fast frames.
     */
    #adaptResolution(timestamp) {
        if (document.hidden) {
            this.#qualityStartedAt = 0;
            return;
        }
        if (!this.#qualityStartedAt) {
            this.#qualityStartedAt = timestamp;
            this.#qualityFrames = 0;
            return;
        }
        this.#qualityFrames += 1;
        const elapsed = timestamp - this.#qualityStartedAt;
        if (elapsed < QUALITY_WINDOW_MS) return;
        const frameMs = elapsed / this.#qualityFrames;
        this.#qualityStartedAt = timestamp;
        this.#qualityFrames = 0;
        if (frameMs > SLOW_FRAME_MS && this.#pixelRatio > MIN_PIXEL_RATIO) {
            this.#fastWindows = 0;
            this.#raiseBackoff = Math.min(this.#raiseBackoff * 2, 48);
            this.#applyPixelRatio(this.#pixelRatio - PIXEL_RATIO_STEP);
        } else if (frameMs < FAST_FRAME_MS && this.#pixelRatio < this.#maxPixelRatio) {
            this.#fastWindows += 1;
            if (this.#fastWindows < this.#raiseBackoff) return;
            this.#fastWindows = 0;
            this.#applyPixelRatio(this.#pixelRatio + PIXEL_RATIO_STEP);
        } else {
            this.#fastWindows = 0;
        }
    }

    #applyPixelRatio(ratio) {
        this.#pixelRatio = Math.min(this.#maxPixelRatio, Math.max(MIN_PIXEL_RATIO, ratio));
        this.#renderer.setPixelRatio(this.#pixelRatio);
        this.#renderer.setSize(this.#lastSize.width, this.#lastSize.height, false);
    }

    #updateFps(timestamp) {
        const existing = document.querySelector('#fps');
        if (!window.prefs?.fps) {
            existing?.remove();
            this.#fpsFrames = 0;
            this.#fpsStartedAt = timestamp;
            return;
        }
        this.#fpsFrames += 1;
        const elapsed = timestamp - this.#fpsStartedAt;
        if (elapsed < 1000) return;
        const badge = existing ?? document.createElement('div');
        badge.id = 'fps';
        badge.textContent = `FPS: ${(this.#fpsFrames * 1000 / elapsed).toFixed(1)}`;
        if (!existing) this.#container.closest('#canvas-container')?.appendChild(badge);
        this.#fpsFrames = 0;
        this.#fpsStartedAt = timestamp;
    }

    /** Resizes WebGL and the camera aspect to the displayed container. */
    resize() {
        const width = Math.max(1, this.#container.clientWidth);
        const height = Math.max(1, this.#container.clientHeight);
        if (width === this.#lastSize.width && height === this.#lastSize.height) return;
        this.#lastSize = { width, height };
        this.#renderer.setSize(width, height, false);
        this.#controls.resize(width, height);
        this.#overlay?.resize();
    }

    /** The crowd slider is kept for the shared settings UI; this renderer has no crowd. */
    setCrowdDensity() {}

    /**
     * Returns the subset of Phaser's API still used by the shared playback UI.
     *
     * @returns {Record<string, unknown>} Compatibility facade.
     */
    createLegacyFacade() {
        const controls = this.#controls;
        const renderer = this;
        return {
            add: {
                audio(name, volume = 1, loop = false) {
                    return renderer.#audio.create(name, { volume, loop });
                },
            },
            camera: {
                get target() {
                    return controls.target;
                },
                follow(object) {
                    controls.follow(object);
                },
                unfollow() {
                    controls.unfollow();
                },
                scale: { x: 1, y: 1 },
            },
            scale: {
                setGameSize() {
                    renderer.resize();
                },
            },
        };
    }

    /**
     * Returns engine/world pairs used by automated browser checks.
     *
     * @returns {{ simtime: number, poison: number, gladiators: Array<Record<string, unknown>>, projectiles: Array<Record<string, unknown>> }} Diagnostic snapshot.
     */
    getDebugSnapshot() {
        return {
            simtime: Number(this.#applied?.simtime),
            poison: Number(this.#applied?.poison),
            gladiators: this.#fighters.map((fighter) => ({
                id: Number(fighter.state.id),
                engineX: Number(fighter.state.x),
                engineY: Number(fighter.state.y),
                hp: Number(fighter.state.hp),
                ...fighter.debug,
            })),
            projectiles: this.#effects.getDebugSnapshot(),
        };
    }

    /** Stops animation and releases DOM, audio, scene and GPU resources. */
    destroy() {
        this.#renderer.setAnimationLoop(null);
        this.#resizeObserver.disconnect();
        this.#controls.destroy();
        this.#overlay.destroy();
        this.#effects.destroy();
        this.#arena.destroy();
        this.#audio.destroy();
        this.#fighters.forEach((fighter) => fighter.destroy());
        this.#tracker.dispose();
        this.#renderer.dispose();
        this.#renderer.domElement.remove();
        document.querySelector('#fps')?.remove();
    }
}
