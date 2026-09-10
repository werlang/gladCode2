import { deriveStepEvents, isOutsideSafeZone } from './battle-state.js';
import { ArenaView } from './arena-view.js';
import { BattleAudioManager } from './audio-manager.js';
import { BattleCameraController } from './camera-controller.js';
import { BattleDomOverlay } from './dom-overlay.js';
import { BattleEffectsLayer } from './effects-layer.js';
import { GladiatorView } from './gladiator-view.js';
import { ResourceTracker } from './resource-tracker.js';/** Trauma is clamped so chained explosions never exceed one full shake. */
const MAX_SHAKE_TRAUMA = 1;
const SHAKE_DECAY_PER_SECOND = 1.9;
const SHAKE_MAX_OFFSET = 0.34;

export class ThreeBattleRenderer {
    #THREE;
    #arena;
    #audio;
    #camera;
    #container;
    #controls;
    #currentState = null;
    #effects;
    #fpsFrames = 0;
    #fpsStartedAt = performance.now();
    #animationLibrary = null;
    #heroAssets;
    #lastCrowdDensity = null;
    #lastPixelsPerUnit = 0;
    #lastSize = { width: 0, height: 0 };
    #lastTimestamp = null;
    #overlay;
    #propAssets;
    #ready = false;
    #reducedMotion;
    #renderer;
    #resizeObserver;
    #scene;
    #shakeTrauma = 0;
    #stateUpdatedAt = performance.now();
    #tracker;
    #views = [];
    #viewsById = new Map();

    /**
     * @param {{ THREE: typeof import('three'), container: HTMLElement, heroAssets?: import('./synty-hero-assets.js').SyntyHeroAssets|null, animationLibrary?: import('./animation-library.js').SyntyAnimationLibrary|null, propAssets?: import('./synty-prop-packs.js').SyntyPropAssets|null, RoomEnvironment?: typeof import('three/addons/environments/RoomEnvironment.js').RoomEnvironment|null }} options Renderer dependencies.
     */
    constructor({ THREE, container, heroAssets = null, animationLibrary = null, propAssets = null, RoomEnvironment = null }) {
        this.#THREE = THREE;
        this.#container = container;
        this.#heroAssets = heroAssets;
        this.#animationLibrary = animationLibrary;
        this.#propAssets = propAssets;
        this.#tracker = new ResourceTracker(THREE);
        this.#audio = new BattleAudioManager();
        this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.#renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.#renderer.toneMappingExposure = 0.94;
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.#renderer.domElement.id = 'battle-render2-canvas';
        this.#renderer.domElement.tabIndex = 0;
        this.#renderer.domElement.setAttribute('aria-label', 'Arena 3D da batalha');
        container.appendChild(this.#renderer.domElement);

        this.#scene = new THREE.Scene();
        // Matches the sky-dome horizon so distant geometry fades seamlessly.
        this.#scene.background = new THREE.Color(0x232c35);
        this.#scene.fog = new THREE.FogExp2(0x232c35, 0.0075);
        this.#applyEnvironment(RoomEnvironment);
        this.#camera = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.1, 120);
        this.#buildLights();
        this.#arena = new ArenaView({ THREE, scene: this.#scene, tracker: this.#tracker, propAssets });
        this.#effects = new BattleEffectsLayer({
            THREE,
            scene: this.#scene,
            audio: this.#audio,
            onShake: (trauma) => this.addShake(trauma),
            arrowFactory: heroAssets?.createArrow.bind(heroAssets) ?? null,
        });
        this.#controls = new BattleCameraController({
            THREE,
            camera: this.#camera,
            canvas: this.#renderer.domElement,
        });
        this.#overlay = new BattleDomOverlay({
            container,
            canvas: this.#renderer.domElement,
            camera: this.#camera,
        });

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

    /** Bakes a neutral image-based light so metals and cloth read with depth. */
    #applyEnvironment(RoomEnvironment) {
        if (!RoomEnvironment) return;
        try {
            const generator = new this.#THREE.PMREMGenerator(this.#renderer);
            this.#scene.environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
            this.#scene.environmentIntensity = 0.22;
            generator.dispose();
        }
        catch (error) {
            console.warn('Ambiente PMREM indisponível; seguindo apenas com luzes.', error);
        }
    }

    /** Builds bounded lighting for readable silhouettes and soft shadows. */
    #buildLights() {
        const THREE = this.#THREE;
        const hemisphere = this.#tracker.track(new THREE.HemisphereLight(0xbfd9e8, 0x5a4429, 0.95));
        this.#scene.add(hemisphere);

        const sun = this.#tracker.track(new THREE.DirectionalLight(0xffe0b0, 1.7));
        sun.position.set(-11, 24, 14);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -22;
        sun.shadow.camera.right = 22;
        sun.shadow.camera.top = 22;
        sun.shadow.camera.bottom = -22;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 65;
        sun.shadow.bias = -0.00015;
        sun.shadow.normalBias = 0.02;
        this.#scene.add(sun);

        const rim = this.#tracker.track(new THREE.DirectionalLight(0x5bc0de, 0.5));
        rim.position.set(12, 10, -12);
        this.#scene.add(rim);
    }

    /**
     * Creates gladiator models once the first complete frame arrives.
     *
     * @param {Array<Record<string, unknown>>} gladiators First-frame gladiators.
     */
    #createGladiators(gladiators) {
        gladiators.forEach((gladiator, index) => {
            const view = new GladiatorView({
                THREE: this.#THREE,
                tracker: this.#tracker,
                heroAssets: this.#heroAssets,
                animationLibrary: this.#animationLibrary,
                gladiator,
                index,
            });
            this.#scene.add(view.root);
            this.#views.push(view);
            this.#viewsById.set(String(gladiator.id ?? index), view);
            window.sprite[index] = view.root;
            window.gladArray[index] = {
                alive: Number(gladiator.hp) > 0,
                hp: Number(gladiator.hp),
                level: Number(gladiator.lvl),
                poison: false,
                sprites: {},
            };
        });
    }

    /**
     * Consumes one complete replay frame; rendering bridges frames smoothly.
     *
     * @param {Record<string, unknown>} state Complete expanded simlog frame.
     */
    update(state) {
        const gladiators = Array.isArray(state.glads) ? state.glads : [];
        if (!gladiators.length) return;
        if (!this.#views.length) this.#createGladiators(gladiators);

        const safeRadius = Number(state.poison);
        const previous = this.#currentState;
        const isNewStep = !previous || Number(previous.simtime) !== Number(state.simtime);
        const simulationTime = Number(state.simtime) || 0;
        const preferences = window.prefs ?? {};

        this.#arena.updateSafeZone(safeRadius);
        gladiators.forEach((gladiator, index) => {
            const view = this.#views[index];
            if (!view) return;
            view.setState(gladiator, safeRadius, simulationTime);
            const compatibilityState = window.gladArray[index] ?? {};
            compatibilityState.alive = Number(gladiator.hp) > 0;
            compatibilityState.hp = Number(gladiator.hp);
            compatibilityState.level = Number(gladiator.lvl);
            compatibilityState.poison = isOutsideSafeZone(gladiator, safeRadius);
            window.gladArray[index] = compatibilityState;
        });

        const projectiles = Array.isArray(state.projectiles) ? state.projectiles : [];
        this.#effects.updateProjectiles(projectiles, this.#viewsById, simulationTime);

        if (isNewStep) {
            const events = deriveStepEvents(previous, state);
            this.#effects.handleEvents(events, this.#viewsById, this.#overlay, {
                ...preferences,
                reducedMotion: this.#reducedMotion,
            }, simulationTime);
            this.#effects.handleBuffTransitions(previous, state, this.#viewsById, preferences);
            this.#pauseAtNewBreakpoints(previous, state);
            window.update_ui?.(state);
            this.#updateLegacyTimeSlider(state);
        }

        this.#currentState = state;
        this.#stateUpdatedAt = performance.now();
        this.#syncCrowdPreference();
        this.#showBattleWhenReady();
    }

    /** Pauses playback when a newly emitted breakpoint reaches the renderer. */
    #pauseAtNewBreakpoints(previous, current) {
        if (!previous) return;
        const previousGlads = Array.isArray(previous.glads) ? previous.glads : [];
        const currentGlads = Array.isArray(current.glads) ? current.glads : [];
        const hasNewBreakpoint = currentGlads.some((gladiator, index) => {
            const breakpoint = typeof gladiator.breakpoint === 'string' ? gladiator.breakpoint : '';
            return breakpoint && breakpoint !== previousGlads[index]?.breakpoint && Number(gladiator.hp) > 0;
        });
        if (hasNewBreakpoint && !window.pausesim) {
            document.querySelector('#pause')?.click();
        }
    }

    /** Updates the existing jQuery UI timeline from simtime, as the classic renderer does. */
    #updateLegacyTimeSlider(state) {
        const simtime = Number(state.simtime);
        if (window.timeSlider === Math.floor(simtime) || !window.jQuery?.fn?.slider) return;
        window.timeSlider = simtime;
        window.jQuery('#time').slider('value', simtime * 10);
    }

    /** Applies crowd density when its persisted preference changes. */
    #syncCrowdPreference() {
        const density = Number(window.prefs?.crowd);
        if (density === this.#lastCrowdDensity) return;
        this.#lastCrowdDensity = density;
        this.#arena.setCrowdDensity(Number.isFinite(density) ? density : 1);
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

    /**
     * Adds camera trauma; the offset decays exponentially while playing.
     *
     * @param {number} trauma Shake strength from zero to one.
     */
    addShake(trauma) {
        if (this.#reducedMotion) return;
        this.#shakeTrauma = Math.min(MAX_SHAKE_TRAUMA, this.#shakeTrauma + Number(trauma) || 0);
    }

    /**
     * Renders an animation frame while keeping game truth replay-driven.
     *
     * @param {number} timestamp requestAnimationFrame timestamp in milliseconds.
     */
    #animate = (timestamp) => {
        const deltaSeconds = this.#lastTimestamp === null ? 1 / 60 : Math.min((timestamp - this.#lastTimestamp) / 1000, 0.1);
        this.#lastTimestamp = timestamp;
        const elapsedSeconds = timestamp / 1000;
        const simulationTime = this.#getAnimationTime();
        const frameProgress = this.#getFrameProgress(timestamp);
        this.resize();
        this.#syncParticleScale();
        this.#controls.update();

        // Trauma-squared falloff keeps small hits subtle and big hits punchy.
        if (this.#shakeTrauma > 0) {
            this.#shakeTrauma = Math.max(0, this.#shakeTrauma - SHAKE_DECAY_PER_SECOND * deltaSeconds);
            const magnitude = this.#shakeTrauma ** 2 * SHAKE_MAX_OFFSET;
            this.#camera.position.x += Math.sin(elapsedSeconds * 31.7) * magnitude;
            this.#camera.position.z += Math.cos(elapsedSeconds * 27.3) * magnitude;
            this.#camera.position.y += Math.sin(elapsedSeconds * 41.1) * magnitude * 0.4;
        }

        this.#arena.animate(this.#reducedMotion ? 0 : elapsedSeconds);
        this.#views.forEach((view) => view.animate(simulationTime, this.#reducedMotion, frameProgress, deltaSeconds));
        this.#effects.animate(elapsedSeconds, simulationTime, deltaSeconds, frameProgress);
        this.#overlay.updatePositions(this.#views, window.prefs ?? {});
        this.#renderer.render(this.#scene, this.#camera);
        this.#updateFps(timestamp);
    };

    /** Interpolates only rig time between authoritative 100 ms replay frames. */
    #getAnimationTime() {
        const frameTime = Number(this.#currentState?.simtime) || 0;
        if (window.pausesim) return frameTime;

        const increment = Number(window.stepIncrement) || 1;
        const direction = Math.sign(increment) || 1;
        const elapsed = (performance.now() - this.#stateUpdatedAt) / 1000 * Math.abs(increment);
        return frameTime + direction * Math.min(elapsed, 0.1);
    }

    /**
     * Progress between the previous and current replay frame for placement
     * blending. Wall-clock based: zero right after a frame lands, one once the
     * next frame is due, and frozen at one while paused.
     *
     * @param {number} now Wall-clock milliseconds.
     * @returns {number} Progress from zero to one.
     */
    #getFrameProgress(now) {
        if (window.pausesim || this.#reducedMotion) return 1;
        const increment = Math.abs(Number(window.stepIncrement) || 1);
        const elapsed = (now - this.#stateUpdatedAt) / 1000 * increment;
        return Math.min(Math.max(elapsed / 0.1, 0), 1);
    }

    /** Keeps particle point sizes stable across zoom and resize changes. */
    #syncParticleScale() {
        const height = Math.max(1, this.#container.clientHeight);
        const pixelsPerUnit = height / this.#controls.viewSize / this.#camera.zoom;
        if (Math.abs(pixelsPerUnit - this.#lastPixelsPerUnit) < 0.5) return;
        this.#lastPixelsPerUnit = pixelsPerUnit;
        this.#effects.setPixelsPerUnit(pixelsPerUnit);
    }

    /**
     * Updates the optional FPS badge from actual WebGL animation frames.
     *
     * @param {number} timestamp requestAnimationFrame timestamp.
     */
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

    /** Resizes WebGL and the orthographic frustum to the displayed container. */
    resize() {
        const width = Math.max(1, this.#container.clientWidth);
        const height = Math.max(1, this.#container.clientHeight);
        if (width === this.#lastSize.width && height === this.#lastSize.height) return;
        this.#lastSize = { width, height };
        this.#renderer.setSize(width, height, false);
        this.#controls.resize(width, height);
    }

    /**
     * Applies the crowd slider immediately.
     *
     * @param {number|string} density Density from zero to one.
     */
    setCrowdDensity(density) {
        this.#lastCrowdDensity = Number(density);
        this.#arena.setCrowdDensity(density);
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
     * Returns engine/world pairs used by automated browser fidelity checks.
     *
     * @returns {{ simtime: number, poison: number, gladiators: Array<Record<string, number>>, projectiles: Array<Record<string, number|string>> }} Diagnostic snapshot.
     */
    getDebugSnapshot() {
        const gladiators = this.#views.map((view) => ({
            id: Number(view.state.id),
            engineX: Number(view.state.x),
            engineY: Number(view.state.y),
            worldX: view.settledPlacement.x,
            worldZ: view.settledPlacement.z,
            heading: Number(view.state.head),
            rotation: view.settledPlacement.heading,
            hp: Number(view.state.hp),
            ap: Number(view.state.ap),
        }));
        return {
            simtime: Number(this.#currentState?.simtime),
            poison: Number(this.#currentState?.poison),
            gladiators,
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
        this.#audio.destroy();
        this.#views.forEach((view) => view.destroy());
        this.#tracker.dispose();
        this.#propAssets?.dispose();
        this.#heroAssets?.dispose();
        this.#renderer.dispose();
        this.#renderer.domElement.remove();
        document.querySelector('#fps')?.remove();
    }
}
