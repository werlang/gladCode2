import { ACTIONS, ARENA_SIZE, deriveStepEvents, headingToRadians, isOutsideSafeZone } from './battle-state.js';
import { Arena } from './arena.js';
import { BattleAudioManager } from './audio-manager.js';
import { MusicDirector } from './music.js';
import { Soundscape } from './soundscape.js';
import { BattleCameraController } from './camera-controller.js';
import { BattleHud } from './hud.js';
import { BattleEffects } from './effects.js';
import { Fighter, TELEPORT_DISTANCE } from './fighter.js';
import { ACTION_BY_ID, ACTION_SPECS, ENGINE_RATE, actionDuration, engineTiming } from './motion.js';
import { loadSynty } from './synty-model.js';
import { renderPortrait } from './portrait.js';
import { getAppearance, sampleSkinColors } from './palette.js';
import { ResourceTracker } from './resource-tracker.js';

const SEEK_SECONDS = 0.45;
/** Seconds between two simlog steps, and how many steps a seek looks back to find where an action began. */
const STEP_SECONDS = 0.1;
const SEEK_BACK_STEPS = 20;
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
    #soundscape;
    #flamesHeard = false;
    #tracker;
    #resizeObserver;
    #reducedMotion;
    #fighters = [];
    #createModel;
    #skinColors = new Map();
    #fightersById = new Map();
    #applied = null;
    #lastArrival = 0;
    #segmentMs = DEFAULT_SEGMENT_MS;
    #segmentStart = 0;
    #wasPaused = false;
    #pausedProgress = null;
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

        this.music = new MusicDirector(this.#audio, Number(window.prefs?.sound?.music) || 0);
        this.#soundscape = new Soundscape(this.#audio);
        this.ending = this.#audio.create('ending');
        this.victory = this.#audio.create('victory');

        this.#resizeObserver = new ResizeObserver(() => this.resize());
        this.#resizeObserver.observe(container);
        this.resize();
        this.#renderer.setAnimationLoop(this.#animate);
    }

    /** @type {MusicDirector} Adaptive battle music with the legacy track API. */
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
        this.#createModel = await loadSynty(this.#THREE, gladiators.map((gladiator, index) => getAppearance(gladiator.skin, index, this.#skinColors)));
        try {
            const { loadSyntyArena } = await import('./synty-arena.js');
            this.#arena.applySynty(await loadSyntyArena(this.#THREE));
            const crowd = Number(window.prefs?.crowd);
            this.#arena.setCrowdDensity(Number.isFinite(crowd) ? crowd : 1);
        }
        catch (error) {
            console.warn('Synty arena props unavailable.', error);
        }
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
            const fighter = new Fighter({ THREE: this.#THREE, gladiator, index, shadowTexture: this.#shadowTexture, colors: this.#skinColors, createModel: this.#createModel });
            fighter.portrait = renderPortrait(this.#THREE, this.#renderer, this.#createModel({ THREE: this.#THREE, look: fighter.appearance, index }));
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
            const continuous = Math.abs(gap) <= SEEK_SECONDS;
            const snap = !continuous || Boolean(window.pausesim);
            this.#applyFrame(state, continuous ? this.#applied : null, snap);
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
        if (snap && window.pausesim) {
            this.#pausedProgress = 1;
        }

        this.#pauseAtNewBreakpoints(previous, state);
        window.update_ui?.(state);
        if (window.followedGlad != null && document.querySelector('#details')) window.updateDetailedWindow?.();
        this.#updateLegacyTimeSlider(state);
        this.#arena.updateSafeZone(safeRadius);
        this.#soundscape.setGas(safeRadius);
        this.#setMusicMood(gladiators, safeRadius, snap);

        const forward = previous && Number(state.simtime) > Number(previous.simtime);
        if (forward && !snap) {
            gladiators.forEach((gladiator, index) => {
                if (Number(gladiator.action) !== Number(previous.glads[index]?.action)) this.#fighters[index]?.startAction(Number(gladiator.action));
            });
            const events = deriveStepEvents(previous, state);
            this.#effects.handleEvents(events, this.#fightersById, this.#overlay, window.prefs ?? {}, state);
            this.#rouseCrowd(events, gladiators);
        }
        else if (!previous) {
            this.#effects.clear();
            this.#audio.stopVoices();
            this.#soundscape.calm();
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
            const teleport = fighter.takeTeleport();
            if (teleport) this.#effects.teleport(teleport.from, teleport.to, window.prefs ?? {});
            fighter.setAlive(Number(gladiator.hp) > 0, snap);
            const compatibility = window.gladArray[index] ?? {};
            compatibility.alive = Number(gladiator.hp) > 0;
            compatibility.hp = Number(gladiator.hp);
            compatibility.level = Number(gladiator.lvl);
            compatibility.poison = isOutsideSafeZone(gladiator, safeRadius);
            fighter.poisoned = compatibility.poison && compatibility.alive;
            window.gladArray[index] = compatibility;
        });
        if (snap) this.#seekPoses(gladiators);
        this.#effects.setProjectiles(Array.isArray(state.projectiles) ? state.projectiles : [], snap);
        this.#applied = state;
    }

    /**
     * After a seek, puts every fighter back where its animation was at the shared timeline position
     * (which may fall between two steps): the action in progress at its age, and the walking pose.
     */
    #seekPoses(gladiators) {
        const steps = window.steps;
        const at = Number(window.timestep);
        const low = Math.floor(at);
        if (!Array.isArray(steps) || !steps[low]) return;
        const before = Math.max(0, low - 1);
        const after = Math.min(steps.length - 1, low + 1);
        gladiators.forEach((gladiator, index) => {
            const fighter = this.#fighters[index];
            if (!fighter || Number(gladiator.hp) <= 0) return;

            let activeAction = null;
            for (let s = low; s >= 0 && low - s <= SEEK_BACK_STEPS; s -= 1) {
                const actionId = Number(steps[s]?.glads?.[index]?.action);
                // Moving or idle means the last action is over; "waiting" is still inside it.
                if (actionId === ACTIONS.movement || actionId === ACTIONS.none) break;
                const name = ACTION_BY_ID[actionId];
                if (!name) continue;
                const spec = ACTION_SPECS[name];
                if (!spec) continue;
                const timing = engineTiming(spec, Number(gladiator[ENGINE_RATE[name]]));
                const duration = timing ? (spec.hold ? timing.cycle : timing.windup + (spec.duration - spec.contact) / timing.follow) : actionDuration(spec);
                const age = (at - s) * STEP_SECONDS;
                if (age >= 0 && age < duration) {
                    activeAction = { id: actionId, name, spec, age };
                    break;
                }
            }

            if (activeAction) {
                fighter.startAction(activeAction.id);
                fighter.seekAction(activeAction.age);
            }
            else {
                fighter.releaseAction();
            }

            let travelled = 0;
            for (let s = 1; s <= low; s += 1) {
                const p0 = steps[s - 1]?.glads?.[index];
                const p1 = steps[s]?.glads?.[index];
                if (p0 && p1) {
                    const d = Math.hypot(Number(p1.x) - Number(p0.x), Number(p1.y) - Number(p0.y));
                    if (d < TELEPORT_DISTANCE) travelled += d;
                }
            }
            const frac = at - low;
            if (frac > 0) {
                const p0 = steps[low]?.glads?.[index];
                const p1 = steps[low + 1]?.glads?.[index];
                if (p0 && p1) {
                    const d = Math.hypot(Number(p1.x) - Number(p0.x), Number(p1.y) - Number(p0.y));
                    if (d < TELEPORT_DISTANCE) travelled += d * frac;
                }
            }

            const from = steps[before]?.glads?.[index];
            const to = steps[after]?.glads?.[index];
            const distance = from && to ? Math.hypot(Number(to.x) - Number(from.x), Number(to.y) - Number(from.y)) : 0;
            if (distance <= TELEPORT_DISTANCE) {
                const seconds = Math.max(1, after - before) * STEP_SECONDS;
                fighter.seekMotion({
                    dx: Number(to.x) - Number(from.x),
                    dz: Number(to.y) - Number(from.y),
                    seconds,
                    travelled,
                });
            }
        });
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
        const isPaused = Boolean(window.pausesim);
        if (isPaused !== this.#wasPaused) {
            this.#wasPaused = isPaused;
            if (isPaused) {
                this.#pausedProgress = Math.min(1, Math.max(0, (performance.now() - this.#segmentStart) / this.#segmentMs));
            } else {
                const prog = this.#pausedProgress ?? 0;
                this.#segmentStart = performance.now() - prog * this.#segmentMs;
                this.#lastArrival = performance.now();
                this.#pausedProgress = null;
            }
        }
        const rate = isPaused ? 0 : Math.abs(Number(window.stepIncrement) || 1);
        const gameDt = realDt * rate;
        const progress = isPaused && this.#pausedProgress !== null
            ? this.#pausedProgress
            : Math.min(1, Math.max(0, (performance.now() - this.#segmentStart) / this.#segmentMs));

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
        this.#updateSound(realDt, isPaused);
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

    /** @param {number} density Share of the stands filled, from the shared settings crowd slider (0 to 1). */
    setCrowdDensity(density) {
        this.#arena.setCrowdDensity(density);
    }

    /** Mix, listener, music fades and the living ambience (fires once the coliseum is up, burning fighters). */
    #updateSound(realDt, isPaused) {
        const prefs = window.prefs ?? {};
        this.#audio.update({ camera: this.#camera, paused: isPaused, speed: Math.abs(Number(window.stepIncrement) || 1), volume: Number(prefs.sound?.sfx) || 0 });
        this.music.update(realDt);
        if (!this.#flamesHeard && this.#arena.flames.length) {
            this.#flamesHeard = true;
            this.#soundscape.setFlames(this.#arena.flames);
        }
        this.#soundscape.setCrowd(prefs.crowd ?? 1);
        for (const fighter of this.#fighters) {
            const burning = Number(fighter.state?.buffs?.burn?.timeleft) > 0 && Number(fighter.state?.hp) > 0;
            this.#soundscape.setBurning(String(fighter.index), burning ? fighter.position : null);
        }
        this.#soundscape.update(realDt);
    }

    /**
     * The music turns tense for the climax: a duel with someone below 40% HP, or the gas closing in. Playing on only
     * ever escalates; a seek re-evaluates from scratch.
     */
    #setMusicMood(gladiators, safeRadius, snap) {
        const alive = gladiators.filter((gladiator) => Number(gladiator.hp) > 0);
        const lowest = Math.min(...alive.map((gladiator) => Number(gladiator.hp) / Math.max(1, Number(gladiator.maxhp) || 100)));
        const climax = (alive.length <= 2 && lowest < 0.4) || safeRadius < 6;
        if (climax) this.music.setMood('climax');
        else if (snap) this.music.setMood('battle');
    }

    /** The crowd rises to deaths, heavy blows and level-ups, and chants for the last one standing. */
    #rouseCrowd(events, gladiators) {
        let intensity = 0;
        for (const event of events) {
            if (event.type === 'death') intensity = Math.max(intensity, 1);
            else if (event.type === 'level-up') intensity = Math.max(intensity, 0.3);
            else if (event.type === 'damage') {
                const victim = this.#fightersById.get(String(event.gladId));
                const share = Number(event.amount) / Math.max(1, Number(victim?.state?.maxhp) || 100);
                if (share > 0.08) intensity = Math.max(intensity, Math.min(0.6, share * 3));
            }
        }
        if (intensity > 0) {
            this.#arena.reactCrowd(intensity);
            this.#soundscape.react(intensity);
        }
        const standing = gladiators.filter((gladiator) => Number(gladiator.hp) > 0).length;
        if (events.some((event) => event.type === 'death') && standing <= 1) this.#soundscape.victory();
    }

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
            audio: { ...this.#audio.status, mood: this.music.mood },
        };
    }

    /**
     * Diagnostics for automated checks: the current level on an audio bus.
     *
     * @param {'master'|'music'|'sfx'|'ambience'} bus Bus to read.
     * @returns {{ peak: number, rms: number }|null} Peak and RMS in dBFS.
     */
    meterAudio(bus) {
        return this.#audio.meter(bus);
    }

    /** Stops animation and releases DOM, audio, scene and GPU resources. */
    destroy() {
        this.#renderer.setAnimationLoop(null);
        this.#resizeObserver.disconnect();
        this.#controls.destroy();
        this.#overlay.destroy();
        this.#effects.destroy();
        this.#arena.destroy();
        this.#soundscape.destroy();
        this.music.destroy();
        this.#audio.destroy();
        this.#fighters.forEach((fighter) => fighter.destroy());
        this.#tracker.dispose();
        this.#renderer.dispose();
        this.#renderer.domElement.remove();
        document.querySelector('#fps')?.remove();
    }
}
