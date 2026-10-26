import { ACTIONS, ARENA_SIZE, deriveStepEvents, headingToRadians, isOutsideSafeZone, isSameMoment } from './battle-state.js';
import { Arena } from './arena.js';
import { BattleAudioManager } from './audio-manager.js';
import { MusicDirector } from './music.js';
import { Soundscape } from './soundscape.js';
import { BattleCameraController } from './camera-controller.js';
import { BattleHud } from './hud.js';
import { PlaybackControls } from './hud-controls.js';
import { BattleEffects } from './effects.js';
import { Fighter, TELEPORT_DISTANCE } from './fighter.js';
import { ACTION_BY_ID, ACTION_SPECS, ENGINE_RATE, actionDuration, engineTiming } from './motion.js';
import { loadSynty } from './synty-model.js';
import { renderPortrait } from './portrait.js';
import { getAppearance, sampleSkinColors } from './palette.js';
import { ResourceTracker } from './resource-tracker.js';
import { HAZE, SKY_RADIUS, createSky } from './sky.js';
import { FrameProfiler } from './frame-profiler.js';
import { disposeSharedTextures } from './textures.js';
import { QUALITY_TIERS, chooseQuality, describeDevice, storedQuality } from './quality.js';

const SEEK_SECONDS = 0.45;
/** Seconds between two simlog steps, and how many steps a seek looks back to find where an action began. */
const STEP_SECONDS = 0.1;
const SEEK_BACK_STEPS = 20;
const DEFAULT_SEGMENT_MS = 100;
const MIN_SEGMENT_MS = 16;
/** Long enough for the slowest replay speed (0.1×: a step every second). */
const MAX_SEGMENT_MS = 1100;
/** The arena's ambience (crowd, fires, gas, clouds) follows the replay: still while paused, slowed in slow motion, at most this fast. */
const AMBIENCE_MAX_RATE = 2;
/** Paused, the arena fades to a moderate grey: how much colour goes, how much it dims, and how fast (per second). */
const PAUSE_GREY = 0.55;
const PAUSE_DIM = 0.08;
const PAUSE_FADE_RATE = 7;
/** After the victory the gas clears outward: its radius grows by this much per second, and per second squared. */
const GAS_CLEAR_SPEED = 3;
const GAS_CLEAR_ACCELERATION = 3;
const MAX_FRAME_DELTA = 0.1;
/** Adaptive resolution: sampled over `QUALITY_WINDOW_MS`, stepping the pixel ratio within these bounds. */
const QUALITY_WINDOW_MS = 700;
const SLOW_FRAME_MS = 21;
const FAST_FRAME_MS = 17.6;
const MIN_PIXEL_RATIO = 0.7;
/** A slow frame whose own main-thread work fills this share of it is CPU-bound (lowering resolution won't help). */
const CPU_BOUND_SHARE = 0.4;
/** Slow measuring windows in a row before detail is shed, the step taken each time, and how far it goes. */
const SHED_AFTER_WINDOWS = 2;
const LOAD_STEP = 0.25;
const MIN_LOAD_SCALE = 0.35;
/** A frame this long (ms) is a loading hitch, not the steady rate; detail is not shed in the first SETTLE_MS either. */
const HITCH_MS = 120;
const SETTLE_MS = 12000;
/** Longest wait for the crowd, floor and countryside before the battle shows anyway (slow devices, slow networks). */
const WARM_UP_TIMEOUT_MS = 25000;
const PIXEL_RATIO_STEP = 0.15;
const RAISE_AFTER_WINDOWS = 6;
const SHAKE_DECAY_PER_SECOND = 1.9;
const SHAKE_MAX_OFFSET = 0.3;
/** Fog: the arena and the near countryside stay clear; the hills fade into the haze toward the horizon. */
const FOG_NEAR = 110;
const FOG_FAR = 560;

/** Engine heading (degrees, 0 = north, clockwise) to the rig's yaw; the rig faces +Z. */
const headingToYaw = (heading) => Math.PI + headingToRadians(heading);

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
    /** Camera pose pinned by `setDebugView`, or null. */
    #debugView = null;
    /** False while `setDebugHud` hides the HUD and controls (clean captures of the scene). */
    #debugHud = true;
    /** Draw calls and triangles of the last scene render (diagnostics). */
    #sceneStats = { calls: 0, triangles: 0 };
    /** Pixel ratio pinned by `setDebugPixelRatio` (the adaptive resolution stands aside), or null. */
    #pinnedRatio = null;
    /** Graphics tier (see quality.js) and its name. */
    #quality;
    #qualityName;
    /** Crowd setting from the player, and the share of it kept after the adaptive loop shed load. */
    #crowdSetting = 1;
    #loadScale = 1;
    #slowWindows = 0;
    #sceneryShed = false;
    /** The pre-battle warm-up is running (see `#warmUp`). */
    #warming = false;
    #lastAdaptAt = null;
    #longestFrame = 0;
    #adaptStartedAt = null;
    #centre = { x: 0, z: 0 };
    /** Per-section frame timings for diagnostics (see `frame-profiler.js`). */
    #profiler;
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
    /** Seconds of arena ambience (see `AMBIENCE_MAX_RATE`). */
    #worldTime = 0;
    /** Pause greying: its level (0 to 1) and the off-screen pass it needs while above zero. */
    #greyLevel = 0;
    #grey = null;
    #pausedProgress = null;
    #lastTimestamp = null;
    #lastSize = { width: 0, height: 0 };
    #shakeTrauma = 0;
    /** The victor's celebration round last cheered by the crowd (-1 while the battle is on). */
    #victoryRound = -1;
    #ready = false;
    /** Canvas replay controls and windows (hud-controls.js). */
    #ui;
    /** The engine's current safe radius, and seconds the gas has been clearing since the victory (null before). */
    #safeRadius = Infinity;
    #gasClear = null;
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

        // Graphics tier for this device (see quality.js): resolution cap, anti-aliasing, crowd and scenery.
        this.#qualityName = chooseQuality(storedQuality(), describeDevice());
        this.#quality = QUALITY_TIERS[this.#qualityName];
        // MSAA on a dense display costs a lot of fill rate for little visible gain
        const density = window.devicePixelRatio || 1;
        this.#renderer = new THREE.WebGLRenderer({ antialias: density < 1.5 && this.#quality.msaa, powerPreference: 'high-performance' });
        this.#profiler = new FrameProfiler(this.#renderer.getContext());
        this.#maxPixelRatio = Math.min(density, this.#quality.pixelRatio);
        this.#pixelRatio = this.#maxPixelRatio;
        this.#renderer.setPixelRatio(this.#pixelRatio);
        this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.#renderer.domElement.id = 'battle-render2-canvas';
        this.#renderer.domElement.tabIndex = 0;
        this.#renderer.domElement.setAttribute('aria-label', 'Arena 3D da batalha');
        container.appendChild(this.#renderer.domElement);

        this.#scene = new THREE.Scene();
        this.#scene.background = new THREE.Color(HAZE);
        // Aerial perspective: the countryside fades into the horizon haze; the arena itself stays clear.
        this.#scene.fog = new THREE.Fog(HAZE, FOG_NEAR, FOG_FAR);
        this.#buildLights();
        this.#camera = new THREE.PerspectiveCamera(45, 1, 1, SKY_RADIUS * 1.2);
        this.#arena = new Arena({ THREE, scene: this.#scene, renderer: this.#renderer, quality: this.#quality });
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
        this.#ui = new PlaybackControls({
            hud: this.#overlay,
            canvas: this.#renderer.domElement,
            host: {
                fighters: () => this.#fighters,
                select: (index) => this.#selectFighter(index),
                stopInspect: () => this.#stopInspect(),
                camera: () => ({ mode: this.#controls.mode, inspectMode: this.#controls.inspectMode, ghost: this.#controls.ghost }),
                exitGhost: () => { if (this.#controls.ghost) this.#controls.toggleGhost(); },
                cycleCamera: () => {
                    const mode = this.#controls.cycleInspectMode();
                    // A camera left free by a drag goes back to the inspected gladiator.
                    const inspected = this.#fighters[window.followedGlad];
                    if (inspected && this.#controls.mode !== 'inspect') this.#controls.follow(inspected);
                    return mode;
                },
                frame: () => this.#applied,
            },
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
        if (window.followedGlad === index && this.#controls.mode === 'inspect') {
            this.#stopInspect();
            return;
        }
        window.followedGlad = index;
        this.#controls.follow(fighter);
        // The inspect window opens minimized.
        this.#ui.inspect(index);
    }

    /** Ends the inspection: the camera is let go and the inspect window closes. */
    #stopInspect() {
        window.followedGlad = null;
        this.#controls.unfollow();
        this.#ui.inspect(null);
    }

    /**
     * Samples the original sprite colors of every skin so the models match the roster.
     * @param {Array<Record<string, unknown>>} gladiators First replay frame gladiators.
     */
    async prepare(gladiators) {
        const thirdContainer = document.querySelector('#loadbar #third');
        const statusArena = document.querySelector('#loadbar #status-arena');
        const thirdBar = document.querySelector('#loadbar #third .bar');
        const secondBar = document.querySelector('#loadbar #second .bar');
        const mainBar = document.querySelector('#loadbar #main .bar');
        const status = document.querySelector('#loadbar #status');

        if (thirdContainer) thirdContainer.style.display = 'block';
        if (statusArena) {
            statusArena.style.display = 'block';
            statusArena.textContent = 'Carregando arena 3D';
        }
        if (thirdBar) thirdBar.style.width = '0%';
        if (status) status.textContent = 'Montando gladiadores 3D';
        if (secondBar) secondBar.style.width = '0%';
        if (mainBar) mainBar.style.width = '50%';

        const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
        const IMAGE_URL = /\.(png|jpe?g|tga|tif|psd)(\?|$)/i;

        const gladiatorManager = new this.#THREE.LoadingManager();
        gladiatorManager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
        gladiatorManager.onProgress = (_url, loaded, total) => {
            const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
            if (secondBar) secondBar.style.width = `${pct}%`;
            if (status) status.textContent = `Montando gladiadores 3D (${loaded}/${total})`;
            if (mainBar) mainBar.style.width = `${50 + Math.round(pct * 0.2)}%`;
        };

        this.#skinColors = await sampleSkinColors(gladiators.map((gladiator) => gladiator.skin));
        this.#createModel = await loadSynty(this.#THREE, gladiators.map((gladiator, index) => getAppearance(gladiator.skin, index, this.#skinColors)), gladiatorManager);

        if (secondBar) secondBar.style.width = '100%';
        if (status) status.textContent = 'Gladiadores prontos';
        if (mainBar) mainBar.style.width = '70%';

        const arenaManager = new this.#THREE.LoadingManager();
        arenaManager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
        arenaManager.onProgress = (_url, loaded, total) => {
            const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
            if (thirdBar) thirdBar.style.width = `${pct}%`;
            if (statusArena) statusArena.textContent = `Carregando arena 3D (${loaded}/${total})`;
            if (mainBar) mainBar.style.width = `${70 + Math.round(pct * 0.25)}%`;
        };

        try {
            const { loadSyntyArena } = await import('./synty-arena.js');
            this.#arena.applySynty(await loadSyntyArena(this.#THREE, arenaManager), arenaManager);
            const crowd = Number(window.prefs?.crowd);
            this.setCrowdDensity(Number.isFinite(crowd) ? crowd : 1);
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
        // The sky's sun hangs where this light comes from.
        const sky = createSky(THREE, sun.position);
        this.#tracker.track(sky.geometry);
        this.#tracker.track(sky.material);
        this.#scene.add(sky);
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
            // Frames repeat while paused or at the end; the engine's last frames share one simtime and may still
            // carry the killing blow, so only a frame that changes nothing is skipped.
            if (isSameMoment(this.#applied, state)) return;
            const gap = simulationTime - Number(this.#applied.simtime);
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
        this.#ui.record(state);
        this.#safeRadius = safeRadius;
        if (this.#gasClear === null) {
            this.#arena.updateSafeZone(safeRadius);
            this.#soundscape.setGas(safeRadius);
        }
        this.#setMusicMood(gladiators, safeRadius, snap);

        const forward = previous && (Number(state.simtime) > Number(previous.simtime)
            || (Number(state.simtime) === Number(previous.simtime) && (Number(window.stepIncrement) || 1) > 0));
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
        // The last one standing celebrates, saluting the imperial box first; a rewind past the final death uncrowns it.
        const standing = gladiators.filter((gladiator) => Number(gladiator.hp) > 0);
        const victor = gladiators.length > 1 && standing.length === 1 ? standing[0] : null;
        gladiators.forEach((gladiator, index) => this.#fighters[index]?.setVictor(gladiator === victor, this.#arena.throne));
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
        if (hasNew && !window.pausesim) window.Playback?.setPaused(true);
    }

    /**
     * Holds the loading screen until the arena is complete and warmed up, then reveals the battle (see `#warmUp`).
     * The render loop keeps drawing behind the loading screen in the meantime.
     */
    #showBattleWhenReady() {
        if (this.#ready || this.#warming) return;
        this.#warming = true;
        this.#warmUp().finally(() => this.#reveal());
    }

    /**
     * Does the one-time GPU work before the battle shows instead of during its first seconds: waits for the crowd,
     * the floor bake and the countryside (at most `WARM_UP_TIMEOUT_MS`), compiles every shader in parallel
     * (pooled effects included) and draws a frame so every texture is uploaded.
     */
    async #warmUp() {
        const status = document.querySelector('#loadbar #status');
        const statusArena = document.querySelector('#loadbar #status-arena');
        const thirdBar = document.querySelector('#loadbar #third .bar');
        const mainBar = document.querySelector('#loadbar #main .bar');
        const say = (text) => {
            if (statusArena) statusArena.textContent = text;
            else if (status) status.textContent = text;
        };
        say('Montando o coliseu');
        await Promise.race([this.#arena.ready, new Promise((resolve) => window.setTimeout(resolve, WARM_UP_TIMEOUT_MS))]);
        say('Preparando os gráficos');
        if (thirdBar) thirdBar.style.width = '100%';
        if (mainBar) mainBar.style.width = '100%';
        this.#effects.setPoolsVisible(true);
        try {
            await this.#renderer.compileAsync(this.#scene, this.#camera);
            this.#renderer.render(this.#scene, this.#camera);
        }
        catch (error) {
            console.warn('Warm-up incomplete; the battle starts anyway.', error);
        }
        finally {
            this.#effects.setPoolsVisible(false);
        }
        // One more frame through the normal loop, so the reveal does not land on a frame still finishing uploads.
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    }

    /** Removes the loader and starts the shared replay state once WebGL is ready. */
    #reveal() {
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
        this.#profiler.begin();
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

        if (this.#debugView) {
            this.#camera.position.set(...this.#debugView.position);
            this.#camera.lookAt(...this.#debugView.target);
        }
        else this.#controls.update(realDt);
        if (this.#shakeTrauma > 0) {
            this.#shakeTrauma = Math.max(0, this.#shakeTrauma - SHAKE_DECAY_PER_SECOND * realDt);
            const magnitude = this.#shakeTrauma ** 2 * SHAKE_MAX_OFFSET;
            this.#camera.position.x += Math.sin(elapsed * 31.7) * magnitude;
            this.#camera.position.z += Math.cos(elapsed * 27.3) * magnitude;
        }

        const profiler = this.#profiler;
        profiler.lap('camera');
        this.#worldTime += realDt * Math.min(rate, AMBIENCE_MAX_RATE);
        this.#arena.animate(this.#reducedMotion ? 0 : this.#worldTime);
        profiler.lap('arena');
        const frame = { realDt, gameDt, progress, elapsed, reducedMotion: this.#reducedMotion };
        for (const fighter of this.#fighters) fighter.update(frame);
        this.#cheerVictor();
        this.#clearGas(realDt);
        profiler.lap('fighters');
        this.#arena.setCrowdFocus(this.#fightCentre());
        this.#effects.update(frame, this.#fighters);
        profiler.lap('effects');
        this.#updateSound(realDt, isPaused);
        profiler.lap('sound');
        const gpu = profiler.gpuBegin();
        this.#greyLevel += ((isPaused ? 1 : 0) - this.#greyLevel) * (1 - Math.exp(-realDt * PAUSE_FADE_RATE));
        if (!isPaused && this.#greyLevel < 0.003) this.#greyLevel = 0;
        if (this.#greyLevel > 0) this.#renderGrey();
        else this.#renderer.render(this.#scene, this.#camera);
        // The HUD pass resets the counters, so the scene's are kept for `getDebugSnapshot`.
        if (!this.#greyLevel) {
            this.#sceneStats.calls = this.#renderer.info.render.calls;
            this.#sceneStats.triangles = this.#renderer.info.render.triangles;
        }
        profiler.gpuEnd(gpu);
        profiler.lap('render');
        const prefs = window.prefs ?? {};
        // The overhead cards make way for the victor's laurels.
        this.#overlay.update(this.#fighters, this.#ui.crowning ? { ...prefs, bars: false, speech: false } : prefs, realDt, gameDt);
        this.#ui.update(realDt, window.prefs ?? {});
        if (this.#debugHud) this.#overlay.render(this.#renderer);
        profiler.lap('hud');
        this.#adaptResolution(timestamp);
    };

    /**
     * Trades resolution for fluidity: drops the pixel ratio when frames run long and
     * cautiously raises it again after a stretch of fast frames.
     */
    #adaptResolution(timestamp) {
        if (this.#pinnedRatio !== null) return;
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
        const gap = this.#lastAdaptAt === null ? 0 : timestamp - this.#lastAdaptAt;
        this.#lastAdaptAt = timestamp;
        this.#longestFrame = Math.max(this.#longestFrame, gap);
        this.#adaptStartedAt ??= timestamp;
        const elapsed = timestamp - this.#qualityStartedAt;
        if (elapsed < QUALITY_WINDOW_MS) return;
        const frameMs = elapsed / this.#qualityFrames;
        const hitch = this.#longestFrame > HITCH_MS;
        this.#qualityStartedAt = timestamp;
        this.#qualityFrames = 0;
        this.#longestFrame = 0;
        // Loading (crowd baking, the countryside, shader compiles) makes long one-off frames: a window holding one
        // says nothing about the steady frame rate, and detail is never shed during the first seconds.
        const settled = timestamp - this.#adaptStartedAt > SETTLE_MS;
        if (hitch) {
            this.#slowWindows = 0;
            return;
        }
        // Resolution only helps when the GPU is the bottleneck; when the frame's own main-thread work (measured
        // exactly by the profiler) fills a large share of it, the CPU is (a throttled laptop, a phone) and detail
        // has to go instead, or the picture just turns blurry at the same frame rate. The GPU timer is not used:
        // on macOS it is emulated and unreliable.
        const cpuBound = this.#profiler.snapshot.cpuTotal >= frameMs * CPU_BOUND_SHARE;
        const sharpFloor = Math.min(this.#maxPixelRatio, 1);
        if (frameMs > SLOW_FRAME_MS && !settled) {
            if (!cpuBound && this.#pixelRatio > sharpFloor + 1e-3) this.#applyPixelRatio(this.#pixelRatio - PIXEL_RATIO_STEP);
            return;
        }
        if (frameMs > SLOW_FRAME_MS) {
            this.#fastWindows = 0;
            this.#slowWindows += 1;
            // Order: resolution down to 1x (GPU-bound only), then shed detail, then resolution below 1x as a last resort.
            if (!cpuBound && this.#pixelRatio > sharpFloor + 1e-3) {
                this.#raiseBackoff = Math.min(this.#raiseBackoff * 2, 48);
                this.#applyPixelRatio(this.#pixelRatio - PIXEL_RATIO_STEP);
            }
            else if (this.#slowWindows >= SHED_AFTER_WINDOWS && this.#canShed()) {
                this.#slowWindows = 0;
                this.#shedLoad();
            }
            else if (!cpuBound && this.#pixelRatio > MIN_PIXEL_RATIO) {
                this.#raiseBackoff = Math.min(this.#raiseBackoff * 2, 48);
                this.#applyPixelRatio(this.#pixelRatio - PIXEL_RATIO_STEP);
            }
        } else if (frameMs < FAST_FRAME_MS && this.#pixelRatio < this.#maxPixelRatio) {
            this.#slowWindows = 0;
            this.#fastWindows += 1;
            if (this.#fastWindows < this.#raiseBackoff) return;
            this.#fastWindows = 0;
            this.#applyPixelRatio(this.#pixelRatio + PIXEL_RATIO_STEP);
        } else {
            this.#fastWindows = 0;
            this.#slowWindows = 0;
        }
    }

    /**
     * Sheds detail when frames stay long and resolution cannot help: first the crowd thins (down to a third of the
     * setting), then the scenery beyond the walls goes. Never restored during the battle, so detail does not flicker.
     */
    #shedLoad() {
        if (this.#loadScale > MIN_LOAD_SCALE + 1e-3) {
            this.#loadScale = Math.max(MIN_LOAD_SCALE, this.#loadScale - LOAD_STEP);
            this.setCrowdDensity(this.#crowdSetting);
        }
        else {
            this.#arena.setScenery(false);
            this.#sceneryShed = true;
        }
    }

    /** @returns {boolean} Whether any detail is left to shed. */
    #canShed() {
        return this.#loadScale > MIN_LOAD_SCALE + 1e-3 || !this.#sceneryShed;
    }

    #applyPixelRatio(ratio) {
        this.#pixelRatio = Math.min(this.#maxPixelRatio, Math.max(MIN_PIXEL_RATIO, ratio));
        this.#renderer.setPixelRatio(this.#pixelRatio);
        this.#renderer.setSize(this.#lastSize.width, this.#lastSize.height, false);
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
        this.#crowdSetting = density;
        // The setting, scaled by the graphics tier and by any load the adaptive loop has shed.
        this.#arena.setCrowdDensity(density * this.#quality.crowd * this.#loadScale);
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
            const burning = fighter.burning;
            this.#soundscape.setBurning(String(fighter.index), burning ? fighter.position : null);
        }
        this.#soundscape.update(realDt);
    }

    /** @returns {{ x: number, z: number }|null} Middle of the living fighters (where the crowd looks), reused. */
    #fightCentre() {
        let x = 0;
        let z = 0;
        let count = 0;
        for (const fighter of this.#fighters) {
            if (!(Number(fighter.state?.hp) > 0)) continue;
            x += fighter.position.x;
            z += fighter.position.z;
            count += 1;
        }
        if (!count) return null;
        this.#centre.x = x / count;
        this.#centre.z = z / count;
        return this.#centre;
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

    /**
     * The crowd rises and cheers again at every round of the victor's celebration. When it begins, the camera films
     * the victor in a slow circle and the laurels crown it; a rewind before the final death undoes both.
     */
    #cheerVictor() {
        let round = -1;
        let victor = null;
        for (const fighter of this.#fighters) {
            if (fighter.celebrationRound > round) {
                round = fighter.celebrationRound;
                victor = fighter;
            }
        }
        if (round > this.#victoryRound) {
            this.#arena.reactCrowd(0.7);
            this.#soundscape.react(0.7);
        }
        if (this.#victoryRound < 0 && round === 0) {
            this.#controls.cinematic(victor);
            this.#ui.showVictory(victor);
        }
        else if (this.#victoryRound >= 0 && round < 0) {
            if (this.#controls.mode === 'cinematic') this.#controls.cinematic(null);
            this.#ui.hideVictory();
        }
        this.#victoryRound = round;
    }

    /** Once the victor celebrates, the gas clears outward from the safe circle until it is gone; a rewind restores it. */
    #clearGas(realDt) {
        if (this.#victoryRound < 0) {
            if (this.#gasClear !== null) {
                this.#gasClear = null;
                this.#arena.updateSafeZone(this.#safeRadius);
                this.#soundscape.setGas(this.#safeRadius);
            }
            return;
        }
        if (!Number.isFinite(this.#safeRadius)) return;
        this.#gasClear = (this.#gasClear ?? 0) + realDt;
        const t = this.#gasClear;
        const radius = this.#safeRadius + GAS_CLEAR_SPEED * t + GAS_CLEAR_ACCELERATION * t * t;
        for (const fighter of this.#fighters) {
            fighter.poisoned = false;
            if (window.gladArray?.[fighter.index]) window.gladArray[fighter.index].poison = false;
        }
        if (radius > 60) return;
        this.#arena.updateSafeZone(radius);
        this.#soundscape.setGas(radius);
    }

    /** The replay reached its last frame (playback.js): a battle without a victor ends in a draw. */
    battleEnded() {
        const standing = this.#fighters.filter((fighter) => Number(fighter.state?.hp) > 0).length;
        if (standing === 0 && this.#fighters.length > 1) this.#ui.showVictory(null);
    }

    /** The replay moved back from its last frame. */
    battleResumed() {
        if (this.#victoryRound < 0) this.#ui.hideVictory();
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
            render: { ...this.#sceneStats },
            timings: { ...this.#profiler.snapshot, pixelRatio: this.#pixelRatio, quality: this.#qualityName, loadScale: this.#loadScale, sceneryShed: this.#sceneryShed },
        };
    }

    /**
     * Diagnostics for automated checks: pins the camera at `position` looking at `target` (world metres) to inspect
     * any corner of the scene, such as a spectator's view from the stands; null hands it back to the controller.
     *
     * @param {{ position: [number, number, number], target: [number, number, number] }|null} view Camera pose.
     */
    setDebugView(view) {
        this.#debugView = view;
    }

    /**
     * Diagnostics for automated checks and captures: hides or shows the HUD pass (roster, cards, controls), so the
     * scene can be filmed clean, as for the front page clip.
     *
     * @param {boolean} visible Whether the HUD is drawn.
     */
    setDebugHud(visible) {
        this.#debugHud = visible;
    }

    /**
     * Diagnostics for automated checks: pins the render resolution (CSS pixels × `ratio`, any value, so a test can
     * mimic a Retina screen) and stops the adaptive resolution; null hands it back.
     *
     * @param {number|null} ratio Pixel ratio.
     */
    setDebugPixelRatio(ratio) {
        this.#pinnedRatio = ratio;
        if (ratio === null) return;
        this.#pixelRatio = ratio;
        this.#renderer.setPixelRatio(ratio);
        this.#renderer.setSize(this.#lastSize.width, this.#lastSize.height, false);
    }

    /**
     * Diagnostics for automated checks: shows or hides a named part of the scene (`synty-crowd`, `synty-landscape`,
     * `synty-coliseum`, `fires`, `sky`, ...) to measure what it costs.
     *
     * @param {string} name Object name in the scene.
     * @param {boolean} visible Whether it is drawn.
     * @returns {boolean} Whether such an object exists.
     */
    setDebugVisible(name, visible) {
        const found = [];
        this.#scene.traverse((node) => node.name === name && found.push(node));
        found.forEach((node) => { node.visible = visible; });
        return found.length > 0;
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

    /**
     * Renders the scene off screen, then onto the canvas through a full-screen pass that takes its colour away by
     * `#greyLevel` (the HUD is drawn after, in full colour). Only while paused or fading, so playing costs nothing.
     */
    #renderGrey() {
        const THREE = this.#THREE;
        const renderer = this.#renderer;
        if (!this.#grey) {
            const material = new THREE.ShaderMaterial({
                uniforms: { map: { value: null }, grey: { value: 0 }, dim: { value: 0 } },
                vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
                fragmentShader: `
                    uniform sampler2D map;
                    uniform float grey;
                    uniform float dim;
                    varying vec2 vUv;
                    void main() {
                        vec3 colour = texture2D(map, vUv).rgb;
                        float luma = dot(colour, vec3(0.2126, 0.7152, 0.0722));
                        gl_FragColor = vec4(mix(colour, vec3(luma), grey) * (1.0 - dim), 1.0);
                        #include <colorspace_fragment>
                    }`,
                depthTest: false,
                depthWrite: false,
            });
            const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
            quad.frustumCulled = false;
            const scene = new THREE.Scene();
            scene.add(quad);
            const samples = renderer.getContext().getContextAttributes()?.antialias ? 4 : 0;
            const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
            this.#grey = { target, scene, quad, material, camera: new THREE.OrthographicCamera(), size: new THREE.Vector2() };
        }
        const grey = this.#grey;
        renderer.getDrawingBufferSize(grey.size);
        if (grey.target.width !== grey.size.x || grey.target.height !== grey.size.y) grey.target.setSize(grey.size.x, grey.size.y);
        renderer.setRenderTarget(grey.target);
        renderer.render(this.#scene, this.#camera);
        this.#sceneStats.calls = renderer.info.render.calls;
        this.#sceneStats.triangles = renderer.info.render.triangles;
        renderer.setRenderTarget(null);
        grey.material.uniforms.map.value = grey.target.texture;
        grey.material.uniforms.grey.value = PAUSE_GREY * this.#greyLevel;
        grey.material.uniforms.dim.value = PAUSE_DIM * this.#greyLevel;
        renderer.render(grey.scene, grey.camera);
    }

    /** Stops animation and releases DOM, audio, scene and GPU resources. */
    destroy() {
        this.#renderer.setAnimationLoop(null);
        if (this.#grey) {
            this.#grey.target.dispose();
            this.#grey.material.dispose();
            this.#grey.quad.geometry.dispose();
        }
        this.#resizeObserver.disconnect();
        this.#controls.destroy();
        this.#ui.destroy();
        this.#overlay.destroy();
        this.#effects.destroy();
        this.#arena.destroy();
        this.#soundscape.destroy();
        this.music.destroy();
        this.#audio.destroy();
        this.#fighters.forEach((fighter) => fighter.destroy());
        this.#tracker.dispose();
        disposeSharedTextures();
        this.#renderer.dispose();
        this.#renderer.domElement.remove();
    }
}
