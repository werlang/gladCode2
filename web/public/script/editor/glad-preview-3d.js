import {
    clampZoom, dragYaw, nextQuarterTurn, pinchZoom, skinKey, wheelZoom,
} from '../helpers/glad-preview.js';

/** Vertical field of view of the preview camera, in degrees. */
const FOV = 30;
/** Share of the visible height the whole body fills at zoom 1. */
const FILL = 0.85;
/** How fast the yaw eases toward its turn target (per second). */
const YAW_EASE = 12;
/** Yaw gap below which the model counts as settled (radians). */
const YAW_SETTLED = 1e-3;
/** Longest frame step accepted, so a background tab does not jump the animation. */
const MAX_FRAME_SECONDS = 0.1;
/** Canvas size used while the preview has no layout (hidden creator), in CSS px. */
const FALLBACK_SIZE = 340;
/** Pixels per wheel line, for browsers that report wheel travel in lines. */
const LINE_PIXELS = 16;

/** Status texts shown in the creator (Portuguese UI). */
const STATUS = Object.freeze({
    building: 'Montando o gladiador em 3D…',
    failed: 'Visualização 3D indisponível; mostrando a prévia clássica.',
});

/**
 * The creator's 3D gladiator: a Synty model drawn into its own WebGL canvas in the creator's preview
 * area, rebuilt whenever the worn layers change. Three.js and the render2 modules are imported only
 * once the creator is on screen, so an editor page that never opens the creator loads none of them.
 *
 * Any failure (no WebGL, missing Synty assets, a network error, a lost context) calls `onFallback` and
 * leaves the sprite in charge for this page load. The stored renderer preference is never touched here.
 */
export class GladPreview3D {
    /** @type {HTMLDivElement} Wrapper holding the canvas. */
    #root;
    /** @type {HTMLCanvasElement} */
    #canvas;
    /** @type {HTMLParagraphElement} Status line (empty when there is nothing to say). */
    #status;
    /** @type {Array<Record<string, unknown>>} Catalogue the palette resolves slots with. */
    #catalog;
    /** @type {(() => void)|null} Called once when the 3D view gives up. */
    #onFallback;
    /** @type {((scale: number) => void)|null} Called when a pinch or the wheel changes the zoom. */
    #onZoom;
    /** Three.js and the render2 functions, imported on first use. */
    #lib = null;
    #renderer = null;
    #scene = null;
    #camera = null;
    #size = null;
    /** Current figure and its factory (the Synty assets it was built from). */
    #model = null;
    #factory = null;
    /** Asset keys the current factory was loaded with, and the looks that asked for them. */
    #loadedNeeds = new Set();
    #looks = new Map();
    /** Weapons carried by the current gear, for `heldWeapon`. */
    #gear = { melee: false, bow: false };
    /** Centre of the figure and the camera distance at zoom 1, measured from the first pose. */
    #center = null;
    #baseDistance = 1;
    /** Worn layers the view should show, the layers the built model has, and the one being built. */
    #wanted = null;
    #builtKey = null;
    #inFlightKey = null;
    /** Each build takes a token; a result whose token is no longer current is dropped. */
    #token = 0;
    /** Animation state. */
    #move = 'walk';
    #playing = false;
    #clock = 0;
    #yaw = 0;
    #targetYaw = 0;
    #zoom = 1;
    #dirty = false;
    /** Loop and visibility: the preview draws only while the creator is on screen. */
    #onScreen = false;
    #observer = null;
    #frameId = 0;
    #last = 0;
    /** Active pointers (drag or pinch) and the pinch start, when two fingers are down. */
    #pointers = new Map();
    #pinch = null;
    #failed = false;
    #disposed = false;
    #onPageHide = () => this.dispose();

    /**
     * @param {object} options
     * @param {HTMLElement} options.host The creator's `#middle-container`.
     * @param {Array<Record<string, unknown>>} options.catalog The sprite catalogue (`images`).
     * @param {() => void} [options.onFallback] Called when the 3D view cannot be shown.
     * @param {(scale: number) => void} [options.onZoom] Called with the new zoom after a pinch or wheel.
     */
    constructor({ host, catalog, onFallback = null, onZoom = null }) {
        this.#catalog = catalog;
        this.#onFallback = onFallback;
        this.#onZoom = onZoom;

        this.#root = document.createElement('div');
        this.#root.className = 'glad-3d';
        this.#canvas = document.createElement('canvas');
        this.#canvas.setAttribute('role', 'img');
        this.#canvas.setAttribute('aria-label', 'Gladiador em 3D: arraste para girar; a roda do mouse ou um gesto de pinça amplia');
        this.#status = document.createElement('p');
        this.#status.className = 'glad-3d-status';
        this.#status.setAttribute('role', 'status');
        this.#root.append(this.#canvas);
        host.append(this.#root, this.#status);

        this.#bindInput();
        this.#observe();
        window.addEventListener('pagehide', this.#onPageHide, { once: true });
    }

    /** @returns {boolean} Whether a model is built and the 3D view has not given up. */
    get ready() {
        return Boolean(this.#model) && !this.#failed;
    }

    /**
     * Shows the worn layers in 3D. Cheap to call on every change: the model is rebuilt only when the
     * set of layers differs from the built one, and only while the creator is on screen (otherwise the
     * request waits for the first time it is shown).
     *
     * @param {string[]} tokens Worn layer ids.
     */
    update(tokens) {
        if (this.#failed || this.#disposed) return;
        this.#wanted = [...tokens];
        this.#schedule();
    }

    /**
     * The animation button: which move the model plays.
     *
     * @param {string} name A key of `PREVIEW_MOVES` (creator-pose.js).
     */
    setMove(name) {
        this.#move = name;
        this.#clock = 0;
        this.#invalidate();
    }

    /**
     * The play/pause button. Pausing returns to the first frame, as the sprite does.
     *
     * @param {boolean} playing
     */
    setPlaying(playing) {
        this.#playing = playing;
        if (!playing) this.#clock = 0;
        this.#invalidate();
    }

    /** The turn button: the next quarter turn, so the model rotates a quarter at a time. */
    turn() {
        this.#targetYaw = nextQuarterTurn(this.#targetYaw);
        this.#invalidate();
    }

    /**
     * The zoom buttons (the creator keeps the scale; this only moves the camera).
     *
     * @param {number} scale Zoom from {@link ZOOM_MIN} to {@link ZOOM_MAX}.
     */
    setZoom(scale) {
        this.#setZoom(scale, false);
    }

    /**
     * A 64 px picture of the gladiator in its current view, for the gladiator card.
     *
     * @param {number} size Side of the picture in px.
     * @returns {HTMLCanvasElement|null} The picture, or null while no model is built (the caller then uses the sprite).
     */
    snapshot(size = 64) {
        if (!this.ready) return null;
        this.#fit();
        // drawn right away, in the same task as the render, so the WebGL buffer still holds the frame
        this.#drawFrame(0);
        const picture = document.createElement('canvas');
        picture.width = size;
        picture.height = size;
        picture.getContext('2d').drawImage(this.#canvas, 0, 0, this.#canvas.width, this.#canvas.height, 0, 0, size, size);
        return picture;
    }

    /** Releases the model, the assets, the WebGL context and the listeners. Safe to call twice. */
    dispose() {
        if (this.#disposed) return;
        this.#disposed = true;
        cancelAnimationFrame(this.#frameId);
        this.#frameId = 0;
        this.#observer?.disconnect();
        window.removeEventListener('pagehide', this.#onPageHide);
        this.#releaseModel();
        this.#releaseRenderer();
        this.#root.remove();
        this.#status.remove();
    }

    /** Starts the watcher that tells the preview whether it is on screen (display:none means not). */
    #observe() {
        if (typeof IntersectionObserver !== 'function') {
            this.#onScreen = true;
            return;
        }
        this.#observer = new IntersectionObserver(([entry]) => {
            this.#onScreen = Boolean(entry?.isIntersecting);
            if (this.#onScreen) {
                this.#schedule();
                this.#startLoop();
            }
        });
        this.#observer.observe(this.#canvas);
    }

    /** Pointer drag turns the model, two fingers pinch the zoom, the wheel zooms. */
    #bindInput() {
        // `touch-action: none` on the canvas (sprite.css) keeps a finger drag from scrolling the page
        const canvas = this.#canvas;
        canvas.addEventListener('pointerdown', (event) => {
            canvas.setPointerCapture?.(event.pointerId);
            this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            this.#startPinch();
        });
        canvas.addEventListener('pointermove', (event) => {
            const previous = this.#pointers.get(event.pointerId);
            if (!previous) return;
            this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (this.#pointers.size === 1) {
                // one finger or the mouse: the drag keeps the same yaw base while the model eases
                this.#targetYaw = dragYaw(this.#targetYaw, event.clientX - previous.x);
                this.#yaw = this.#targetYaw;
                this.#invalidate();
            }
            else if (this.#pinch && this.#pointers.size === 2) {
                const [a, b] = [...this.#pointers.values()];
                this.#setZoom(pinchZoom(this.#pinch.scale, this.#pinch.gap, Math.hypot(a.x - b.x, a.y - b.y)), true);
            }
        });
        const release = (event) => {
            this.#pointers.delete(event.pointerId);
            this.#startPinch();
        };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const deltaY = event.deltaMode === 1 ? event.deltaY * LINE_PIXELS : event.deltaY;
            this.#setZoom(wheelZoom(this.#zoom, deltaY), true);
        }, { passive: false });
    }

    /** Remembers the zoom and the finger gap when a second finger goes down; forgets them otherwise. */
    #startPinch() {
        if (this.#pointers.size !== 2) {
            this.#pinch = null;
            return;
        }
        const [a, b] = [...this.#pointers.values()];
        this.#pinch = { scale: this.#zoom, gap: Math.hypot(a.x - b.x, a.y - b.y) };
    }

    /**
     * Sets the zoom and moves the camera.
     *
     * @param {number} scale Requested zoom (clamped).
     * @param {boolean} notify Tell the creator (pinch and wheel; the buttons already know).
     */
    #setZoom(scale, notify) {
        this.#zoom = clampZoom(scale);
        this.#placeCamera();
        this.#invalidate();
        if (notify) this.#onZoom?.(this.#zoom);
    }

    /** Starts a build for the wanted layers, unless one is running or the model already matches. */
    #schedule() {
        if (this.#disposed || this.#failed || !this.#onScreen || !this.#wanted) return;
        const key = skinKey(this.#wanted);
        if (key === this.#inFlightKey) return;
        // a newer request makes any build still running stale, even when this key is the built one
        this.#token += 1;
        if (key === this.#builtKey) {
            this.#inFlightKey = null;
            return;
        }
        this.#inFlightKey = key;
        this.#build([...this.#wanted], key, this.#token);
    }

    /**
     * Builds the model of the worn layers. A result whose token is stale is dropped; a factory it
     * loaded but no longer needs is disposed at once.
     *
     * @param {string[]} tokens Worn layer ids.
     * @param {string} key Identity of `tokens` (see `skinKey`).
     * @param {number} token Build token; only the current one may change the view.
     */
    async #build(tokens, key, token) {
        try {
            if (!this.#model) this.#setStatus(STATUS.building);
            const lib = await this.#library();
            const look = await this.#appearance(tokens);
            if (token !== this.#token || this.#disposed) return;
            this.#ensureRenderer(lib.THREE);

            // Asset union: a new layer that needs an asset the factory lacks reloads it with every look so far.
            const needs = lib.assetNeeds(look);
            let factory = this.#factory;
            let loadedNeeds = this.#loadedNeeds;
            if (!needs.every((need) => this.#loadedNeeds.has(need))) {
                this.#looks.set(needs.join('|'), look);
                const looks = [...this.#looks.values()];
                factory = await lib.loadSynty(lib.THREE, looks);
                loadedNeeds = new Set(looks.flatMap((item) => lib.assetNeeds(item)));
            }
            if (token !== this.#token || this.#disposed) {
                if (factory !== this.#factory) factory.dispose();
                return;
            }
            const model = factory({ THREE: lib.THREE, look, index: 0 });
            this.#swap(model, factory, loadedNeeds, look);
            this.#builtKey = key;
        }
        catch (error) {
            if (token === this.#token) this.#fail(error);
        }
        finally {
            if (token === this.#token) this.#inFlightKey = null;
        }
    }

    /**
     * Makes the new model the shown one, then frees the old model and, if the assets changed, the old assets.
     * The old model goes first: its geometry and textures belong to the old factory.
     *
     * @param {object} model New `SyntyModel`.
     * @param {{ dispose(): void }} factory Assets the model was built from.
     * @param {Set<string>} loadedNeeds Asset keys the factory covers.
     * @param {Record<string, any>} look Appearance the model shows.
     */
    #swap(model, factory, loadedNeeds, look) {
        const previous = this.#model;
        const previousFactory = this.#factory;
        this.#model = model;
        this.#factory = factory;
        this.#loadedNeeds = loadedNeeds;
        this.#gear = { melee: Boolean(look.tokens?.melee), bow: Boolean(look.tokens?.ranged) };

        this.#scene.add(model.figure);
        this.#drawFrame(0);
        this.#frame(model.figure);
        if (previous) {
            this.#scene.remove(previous.figure);
            previous.dispose();
        }
        if (previousFactory && previousFactory !== factory) previousFactory.dispose();
        this.#setStatus('');
        this.#invalidate();
        this.#startLoop();
    }

    /**
     * Measures the figure once per model: its centre and the camera distance that fits the body at zoom 1.
     *
     * @param {import('three').Object3D} figure The posed figure at its first frame.
     */
    #frame(figure) {
        const THREE = this.#lib.THREE;
        const box = new THREE.Box3().setFromObject(figure);
        this.#center = box.getCenter(new THREE.Vector3());
        const height = Math.max(0.1, box.max.y - box.min.y);
        this.#baseDistance = height / (2 * Math.tan((FOV * Math.PI) / 360) * FILL);
        this.#placeCamera();
    }

    /** Puts the camera in front of the figure, at the distance the zoom asks for. */
    #placeCamera() {
        if (!this.#camera || !this.#center) return;
        const distance = this.#baseDistance / this.#zoom;
        this.#camera.position.set(this.#center.x, this.#center.y, this.#center.z + distance);
        this.#camera.lookAt(this.#center);
    }

    /**
     * Applies the current move, weapon and turn to the model, then draws it.
     *
     * @param {number} seconds Game seconds this frame advances the animation (0 while paused).
     */
    #drawFrame(seconds) {
        if (!this.#model || !this.#renderer) return;
        const lib = this.#lib;
        const turn = this.#targetYaw - this.#yaw;
        const { pose, options } = lib.previewFrame({
            move: this.#move,
            elapsed: this.#clock,
            dt: seconds,
            playing: this.#playing,
            turn,
        });
        this.#model.figure.rotation.y = this.#yaw;
        // the weapon is set before the pose: the bow's pull is skipped while the bow is hidden
        this.#model.setWeapons(lib.heldWeapon(this.#move, this.#gear.melee, this.#gear.bow), null);
        this.#model.applyPose(pose, options);
        this.#renderer.render(this.#scene, this.#camera);
    }

    /** Marks the view as changed and makes sure the loop is running to show it. */
    #invalidate() {
        this.#dirty = true;
        this.#startLoop();
    }

    /** Starts the frame loop when it is needed: a model exists and the preview is on screen. */
    #startLoop() {
        if (this.#frameId || this.#disposed || !this.#onScreen || !this.#model) return;
        this.#last = 0;
        this.#frameId = requestAnimationFrame(this.#tick);
    }

    /**
     * One frame: eases the yaw, advances the clock while playing and draws when anything changed.
     * The loop stops itself once the preview is off screen.
     *
     * @param {number} now Timestamp from requestAnimationFrame, in ms.
     */
    #tick = (now) => {
        this.#frameId = 0;
        if (this.#disposed || !this.#onScreen || !this.#model) return;
        const seconds = this.#last ? Math.min(MAX_FRAME_SECONDS, (now - this.#last) / 1000) : 0;
        this.#last = now;

        // "moving" is read before the easing, so the frame that lands the yaw is still drawn
        const moving = this.#playing || this.#dirty || Math.abs(this.#targetYaw - this.#yaw) > YAW_SETTLED;
        this.#yaw += (this.#targetYaw - this.#yaw) * (1 - Math.exp(-seconds * YAW_EASE));
        if (this.#playing) this.#clock += seconds;
        if (this.#fit()) this.#dirty = true;
        if (moving || this.#dirty) {
            this.#drawFrame(this.#playing ? seconds : 0);
            this.#dirty = false;
        }
        this.#frameId = requestAnimationFrame(this.#tick);
    };

    /**
     * Matches the drawing buffer to the canvas's on-screen size. A hidden canvas has no size, so it
     * keeps a square fallback until it is shown.
     *
     * @returns {boolean} Whether the size changed.
     */
    #fit() {
        if (!this.#renderer) return false;
        const width = this.#canvas.clientWidth || FALLBACK_SIZE;
        const height = this.#canvas.clientHeight || FALLBACK_SIZE;
        if (this.#size && this.#size.width === width && this.#size.height === height) return false;
        this.#size = { width, height };
        this.#renderer.setSize(width, height, false);
        this.#camera.aspect = width / height;
        this.#camera.updateProjectionMatrix();
        return true;
    }

    /**
     * Creates the WebGL renderer, once per page. Its context is the only one the creator holds.
     *
     * @param {typeof import('three')} THREE Three.js namespace.
     */
    #ensureRenderer(THREE) {
        if (this.#renderer) return;
        const renderer = new THREE.WebGLRenderer({ canvas: this.#canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        this.#renderer = renderer;
        this.#scene = new THREE.Scene();
        this.#camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
        // Scene light, not theme colours: the figure reads the same in every theme.
        this.#scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a48, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(1.5, 3, 2.5);
        this.#scene.add(sun);
        this.#canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.#fail(new Error('WebGL context lost'));
        });
    }

    /** @returns {Promise<Record<string, any>>} Three.js and the render2 functions the preview uses (imported once). */
    async #library() {
        if (!this.#lib) {
            const [THREE, synty, palette, pose] = await Promise.all([
                import('three'),
                import('../render2/synty-model.js'),
                import('../render2/palette.js'),
                import('../render2/creator-pose.js'),
            ]);
            this.#lib = { THREE, ...synty, ...palette, ...pose };
        }
        return this.#lib;
    }

    /**
     * The appearance of a set of layers: the sprite colours sampled from its sheets, then the palette
     * traits and the slot tokens the Synty outfit is built from.
     *
     * @param {string[]} tokens Worn layer ids.
     * @returns {Promise<Record<string, any>>} The look (`palette.getAppearance`).
     */
    async #appearance(tokens) {
        const colors = await this.#lib.sampleSkinColors([tokens], this.#catalog);
        return this.#lib.getAppearance(tokens, 0, colors, this.#catalog);
    }

    /** Frees the model and its assets. The renderer and its context stay. */
    #releaseModel() {
        if (this.#model) {
            this.#scene?.remove(this.#model.figure);
            this.#model.dispose();
        }
        this.#factory?.dispose();
        this.#model = null;
        this.#factory = null;
        this.#loadedNeeds = new Set();
        this.#looks.clear();
        this.#builtKey = null;
        this.#gear = { melee: false, bow: false };
    }

    /** Frees the WebGL renderer and forces its context away so the browser can reuse the slot. */
    #releaseRenderer() {
        this.#renderer?.dispose();
        this.#renderer?.forceContextLoss();
        this.#renderer = null;
        this.#scene = null;
        this.#camera = null;
        this.#size = null;
    }

    /**
     * Gives up on the 3D view for this page load: frees everything, hides the canvas and tells the
     * creator to show the sprite. The stored preference is not changed.
     *
     * @param {unknown} error Why the 3D view could not be shown.
     */
    #fail(error) {
        if (this.#failed || this.#disposed) return;
        this.#failed = true;
        console.warn('Não foi possível montar o gladiador em 3D.', error);
        this.#releaseModel();
        this.#releaseRenderer();
        this.#root.classList.add('is-hidden');
        this.#setStatus(STATUS.failed);
        this.#onFallback?.();
    }

    /** @param {string} text Status line; empty hides it. */
    #setStatus(text) {
        this.#status.textContent = text;
    }
}
