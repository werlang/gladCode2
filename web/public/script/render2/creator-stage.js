import { PreviewMotion } from './creator-motion.js';
import { ZOOM, clampZoom, framing, nextQuarter } from './creator-view.js';
import { Fighter } from './fighter.js';
import { getAppearance, sampleSkinColors } from './palette.js';
import { QUALITY_TIERS, chooseQuality, describeDevice, storedQuality } from './quality.js';
import { SyntyLibrary } from './synty-model.js';

/** Vertical field of view of the creator camera, in degrees. */
const FOV = 30;
/** How far the camera looks down on the gladiator (radians). */
const PITCH = 0.14;
/** Rate at which the turntable and the zoom ease toward a new value (per second). */
const EASE_RATE = 10;
/** Height of the top of the head over the `Head` bone, as a share of the bone's height; and the height assumed before measuring. */
const HEAD_TOP = 1.18;
const DEFAULT_HEIGHT = 0.85;
/** Context attributes: a transparent canvas over the creator's themed surface. */
const CONTEXT_ATTRIBUTES = Object.freeze({ alpha: true, depth: true, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });

/**
 * The gladiator creator's 3D view: one WebGL renderer for its lifetime, a turntable with the gladiator built by the
 * battle's own `Fighter` (Synty model, outfit, weapons, the battle's motions), lit like the arena by day. Selection
 * changes rebuild the fighter (only the newest request wins; the old one is destroyed); the render loop runs only
 * between `start` and `stop`, and draws only while something moves.
 */
export class CreatorStage {
    #THREE;
    #renderer;
    #scene;
    #camera;
    #turntable;
    #library;
    #catalog;
    #shadowTexture;
    #reducedMotion;
    #fighter = null;
    /** JSON of the skin on the turntable, and the counter that lets only the newest `show` swap the fighter in. */
    #shownSkin = null;
    #generation = 0;
    #move = 'walk';
    #motion = null;
    #playing = false;
    #yaw = 0;
    #targetYaw = 0;
    #zoom = ZOOM.min;
    #targetZoom = ZOOM.min;
    #height = DEFAULT_HEIGHT;
    #pixelRatio;
    #running = false;
    #last = 0;
    #dirty = true;
    #disposed = false;
    #resizeObserver;
    #head;

    /**
     * Opens the WebGL2 context the stage draws with (three needs WebGL2), so a browser without it is found before
     * three is downloaded.
     *
     * @param {HTMLCanvasElement} canvas Canvas the stage will draw on.
     * @returns {WebGL2RenderingContext|null} The context, or null when the browser cannot give one.
     */
    static openContext(canvas) {
        const tier = QUALITY_TIERS[chooseQuality(storedQuality(), describeDevice())];
        try {
            return canvas.getContext('webgl2', { ...CONTEXT_ATTRIBUTES, antialias: tier !== QUALITY_TIERS.low });
        }
        catch {
            return null;
        }
    }

    /**
     * @param {{ THREE: typeof import('three'), canvas: HTMLCanvasElement, context: WebGL2RenderingContext,
     *   catalog: Array<Record<string, unknown>>, library?: { prepare: (looks: object[]) => Promise<Function> }, reducedMotion?: boolean }} options
     *   Three, the canvas and the context from {@link CreatorStage.openContext}, the sprite catalogue (resolves skin
     *   tokens), the Synty library (one per stage by default) and whether turns snap instead of easing.
     */
    constructor({ THREE, canvas, context, catalog, library = new SyntyLibrary(THREE), reducedMotion = false }) {
        this.#THREE = THREE;
        this.#catalog = catalog;
        this.#library = library;
        this.#reducedMotion = reducedMotion;
        this.#head = new THREE.Vector3();

        this.#renderer = new THREE.WebGLRenderer({ canvas, context });
        this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.#renderer.setClearColor(0x000000, 0);
        const tier = QUALITY_TIERS[chooseQuality(storedQuality(), describeDevice())];
        this.#pixelRatio = Math.min(window.devicePixelRatio || 1, tier.pixelRatio);
        this.#renderer.setPixelRatio(this.#pixelRatio);

        this.#scene = new THREE.Scene();
        this.#camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 30);
        this.#turntable = new THREE.Group();
        this.#scene.add(this.#turntable);
        this.#addLights();
        this.#shadowTexture = this.#createShadowTexture();

        this.#resizeObserver = new ResizeObserver(() => this.resize());
        this.#resizeObserver.observe(canvas.parentElement ?? canvas);
        this.resize();
    }

    /** @returns {number} The zoom the view is heading to (`ZOOM.min` to `ZOOM.max`). */
    get zoom() {
        return this.#targetZoom;
    }

    /** @returns {boolean} Whether a gladiator stands on the turntable. */
    get ready() {
        return Boolean(this.#fighter);
    }

    /**
     * Puts the gladiator of `skin` on the turntable: samples its sprite colours, loads what its outfit needs and swaps
     * the new fighter in for the old one, which is destroyed. A newer call supersedes an older one still loading.
     *
     * @param {string[]} skin Catalogue ids of the worn layers.
     * @returns {Promise<boolean>} True once this skin is shown; false when a newer call (or `dispose`) took over.
     * @throws {Error} When the models cannot be loaded or built (only for the newest call).
     */
    async show(skin) {
        const key = JSON.stringify(skin);
        // every call supersedes the ones still loading, even one back to the skin already shown
        const generation = ++this.#generation;
        if (key === this.#shownSkin && this.#fighter) return true;
        const current = () => generation === this.#generation && !this.#disposed;
        try {
            const colors = await sampleSkinColors([skin], this.#catalog);
            const look = getAppearance(skin, 0, colors, this.#catalog);
            const createModel = await this.#library.prepare([look]);
            if (!current()) return false;
            const fighter = new Fighter({
                THREE: this.#THREE, gladiator: { skin }, index: 0, shadowTexture: this.#shadowTexture, colors, createModel, catalog: this.#catalog,
            });
            this.#swap(fighter);
            this.#shownSkin = key;
            return true;
        }
        catch (error) {
            // a failure of a request that was already superseded is not this view's problem any more
            if (!current()) return false;
            throw error;
        }
    }

    /**
     * Plays a creator animation (see `creator-motion.js` `PREVIEW_ACTIONS`); while paused, shows its first moment.
     *
     * @param {string} move `walk`, `cast`, `thrust`, `slash` or `shoot`.
     */
    setMove(move) {
        this.#move = move;
        this.#restartMotion();
    }

    /** @param {boolean} playing Animate (true) or hold the first moment of the animation (false), like the sprite. */
    setPlaying(playing) {
        this.#playing = Boolean(playing);
        this.#restartMotion();
    }

    /** Turns the gladiator to the next of the four facings (a quarter turn to its left, like the sprite button). */
    turn() {
        this.#targetYaw = nextQuarter(this.#targetYaw);
        if (this.#reducedMotion) this.#yaw = this.#targetYaw;
        this.#dirty = true;
    }

    /** @param {number} radians Spins the turntable by this much at once (drags and keys). */
    rotate(radians) {
        this.#targetYaw += radians;
        this.#yaw = this.#targetYaw;
        this.#dirty = true;
    }

    /** @param {number} zoom Zoom to ease to (clamped to `ZOOM`). */
    zoomTo(zoom) {
        this.#targetZoom = clampZoom(zoom);
        if (this.#reducedMotion) this.#zoom = this.#targetZoom;
        this.#dirty = true;
    }

    /** @param {number} step Zoom change, like the sprite's ±0.5 buttons. */
    zoomBy(step) {
        this.zoomTo(this.#targetZoom + step);
    }

    /** Starts the render loop (the creator is on screen). */
    start() {
        if (this.#running || this.#disposed) return;
        this.#running = true;
        this.#last = 0;
        this.#dirty = true;
        this.#renderer.setAnimationLoop(this.#frame);
    }

    /** Stops the render loop (the creator left the screen); nothing runs until `start`. */
    stop() {
        if (!this.#running) return;
        this.#running = false;
        this.#renderer.setAnimationLoop(null);
    }

    /** Fits the drawing buffer and the camera to the canvas's displayed size. */
    resize() {
        const canvas = this.#renderer.domElement;
        const width = Math.max(1, Math.round(canvas.clientWidth));
        const height = Math.max(1, Math.round(canvas.clientHeight));
        this.#renderer.setSize(width, height, false);
        this.#camera.aspect = width / height;
        this.#camera.updateProjectionMatrix();
        this.#dirty = true;
    }

    /** Releases the fighter, the stage's own textures and the WebGL context; the stage is unusable afterwards. */
    dispose() {
        if (this.#disposed) return;
        this.#disposed = true;
        this.stop();
        this.#resizeObserver.disconnect();
        this.#fighter?.destroy();
        this.#fighter = null;
        this.#shadowTexture.dispose();
        this.#renderer.dispose();
        this.#renderer.forceContextLoss();
    }

    /** Puts a newly built fighter on the turntable in the current animation, and destroys the one it replaces. */
    #swap(fighter) {
        const old = this.#fighter;
        this.#turntable.add(fighter.root);
        this.#fighter = fighter;
        old?.destroy();
        this.#restartMotion();
        // frame the body by its head: helmets, hair and the skeleton change the height a little
        const ground = fighter.root.position.y;
        const head = fighter.bonePosition('Head', this.#head).y - ground;
        this.#height = head > 0.2 && head < 2 ? head * HEAD_TOP : DEFAULT_HEIGHT;
    }

    /**
     * Starts the current animation over: playing, from the top of its loop; paused, holding its first moment (the
     * action started but not advanced, so the right weapon is in hand), as the sprite shows its first frame.
     */
    #restartMotion() {
        const fighter = this.#fighter;
        if (!fighter) return;
        fighter.reset();
        this.#motion = new PreviewMotion(this.#move, fighter.appearance.weapon);
        if (!this.#playing) {
            if (this.#motion.action !== null) fighter.startAction(this.#motion.action);
            fighter.update({ gameDt: 0, progress: 1, reducedMotion: this.#reducedMotion });
        }
        this.#dirty = true;
    }

    /** One animation frame: advance the animation while playing, ease the turn and zoom, draw if anything changed. */
    #frame = (now) => {
        const dt = this.#last ? Math.min(0.1, (now - this.#last) / 1000) : 0;
        this.#last = now;
        const easing = this.#ease(dt);
        const fighter = this.#fighter;
        if (fighter && this.#playing && dt > 0) {
            const step = this.#motion.advance(dt);
            if (step.start) fighter.startAction(this.#motion.action);
            if (step.fire) fighter.fire();
            if (step.walk) fighter.seekMotion(step.walk);
            fighter.update({ gameDt: dt, progress: 1, reducedMotion: this.#reducedMotion });
            this.#dirty = true;
        }
        if (!this.#dirty && !easing) return;
        this.#dirty = false;
        this.#placeCamera();
        this.#renderer.render(this.#scene, this.#camera);
    };

    /** Moves the turntable and the zoom toward their targets; true while they are still moving. */
    #ease(dt) {
        const blend = 1 - Math.exp(-EASE_RATE * dt);
        this.#yaw += (this.#targetYaw - this.#yaw) * blend;
        this.#zoom += (this.#targetZoom - this.#zoom) * blend;
        if (Math.abs(this.#targetYaw - this.#yaw) < 1e-3) this.#yaw = this.#targetYaw;
        if (Math.abs(this.#targetZoom - this.#zoom) < 1e-3) this.#zoom = this.#targetZoom;
        this.#turntable.rotation.y = this.#yaw;
        return this.#yaw !== this.#targetYaw || this.#zoom !== this.#targetZoom;
    }

    /** Frames the gladiator for the current zoom, looking slightly down on it. */
    #placeCamera() {
        const ground = this.#fighter?.root.position.y ?? 0;
        const { distance, targetY } = framing(this.#zoom, { height: this.#height, fov: FOV });
        const y = ground + targetY;
        this.#camera.position.set(0, y + Math.sin(PITCH) * distance, Math.cos(PITCH) * distance);
        this.#camera.lookAt(0, y, 0);
    }

    /** The arena's daylight (renderer.js `#buildLights`), with the sun brought round to the camera's side. */
    #addLights() {
        const THREE = this.#THREE;
        const sun = new THREE.DirectionalLight(0xfff0d8, 1.9);
        sun.position.set(-1.5, 2.2, 3);
        const fill = new THREE.DirectionalLight(0x9cc8ff, 0.45);
        fill.position.set(2, 1, -2);
        this.#scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.25), sun, fill);
    }

    /** Soft round blob under the feet, the same contact shadow as in the arena (renderer.js `#createShadowTexture`). */
    #createShadowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
        gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        return new this.#THREE.CanvasTexture(canvas);
    }
}
