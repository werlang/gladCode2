import { BaseComponent } from '../components/base-component.js';
import { createElement } from '../helpers/html.js';
import { images } from '../helpers/sprite-catalog.js';
import { ZOOM, dragYaw, pinchZoom, wheelZoom } from '../render2/creator-view.js';
import { skinStageCanvasTemplate, skinStageTemplate, skinStatusTemplate } from '../templates/editor.js';

/** What the status line says while the 3D view loads, or why the sprite stays. */
const STATUS = Object.freeze({
    loading: 'Carregando visual 3D…',
    noWebgl: 'Este navegador não mostra 3D. Exibindo o sprite.',
    failed: 'Visual 3D indisponível. Exibindo o sprite.',
});
/** Turn of one arrow key press (radians). */
const KEY_TURN = Math.PI / 12;
/** Pixels per wheel line and per wheel page, for browsers that scroll in those units. */
const WHEEL_UNITS = [1, 16, 400];

/**
 * The 3D gladiator of the creator (`#middle-container`), shown instead of the sprite when the battle renderer
 * preference is the 3D one. Nothing loads until the creator is on screen: then Three.js, the stage and the Synty
 * models; the render loop runs only while the view is visible and the WebGL context is released when the page is
 * left. Until the first gladiator is ready, and for good if it never is (no WebGL, missing assets, a failed load),
 * the sprite stays with a status line; the stored preference is never touched.
 *
 * Drag (or the arrow keys) to turn the gladiator, wheel or pinch (or + and -) to zoom; the creator's buttons call
 * {@link SkinPreview3D#turn}, {@link SkinPreview3D#zoomBy}, {@link SkinPreview3D#setPlaying} and
 * {@link SkinPreview3D#setMove}.
 */
export class SkinPreview3D extends BaseComponent {
    #container;
    #status;
    #canvas = null;
    /** @type {import('../render2/creator-stage.js').CreatorStage|null} */
    #stage = null;
    /** `idle` (nothing loaded), `loading`, `ready` (3D on screen) or `failed` (sprite for the rest of the visit). */
    #state = 'idle';
    #visible = false;
    #skin = [];
    #move = 'walk';
    #playing = false;
    /** Pointers down on the view (by id, last position) and the pinch under way. */
    #pointers = new Map();
    #pinch = null;

    /**
     * @param {HTMLElement} container The creator's `#middle-container`, which also holds the sprite canvas.
     */
    constructor(container) {
        super(createElement(skinStageTemplate));
        this.#container = container;
        this.#status = createElement(skinStatusTemplate);
        container.append(this.element, this.#status);
        this.#bindGestures();
        // the overlay and the attributes screen hide the view with display: none, which ends the intersection
        new IntersectionObserver(entries => this.#setVisible(entries[entries.length - 1].isIntersecting)).observe(container);
        this.on(window, 'pagehide', () => this.#release());
        this.on(window, 'pageshow', event => {
            if (event.persisted && this.#visible) this.#setVisible(true);
        });
    }

    /** @returns {boolean} Whether the 3D gladiator is on screen (otherwise the creator shows the sprite). */
    get active() {
        return this.#state === 'ready';
    }

    /** @param {string[]} skin Catalogue ids of the worn layers; the gladiator is rebuilt when the view is visible. */
    setSkin(skin) {
        this.#skin = [...skin];
        this.#show();
    }

    /** @param {string} move Animation of the creator's animation button (`walk`, `cast`, `thrust`, `slash`, `shoot`). */
    setMove(move) {
        this.#move = move;
        this.#stage?.setMove(move);
    }

    /** @param {boolean} playing Whether the animation plays (the creator's play/pause button). */
    setPlaying(playing) {
        this.#playing = playing;
        this.#stage?.setPlaying(playing);
    }

    /** Turns the gladiator to its next facing (the creator's rotate button). */
    turn() {
        this.#stage?.turn();
    }

    /** @param {number} step Zoom change (the creator's zoom buttons). */
    zoomBy(step) {
        this.#stage?.zoomBy(step);
    }

    /** Starts the view the first time it shows, and runs or stops its render loop as it shows and hides. */
    #setVisible(visible) {
        this.#visible = visible;
        if (!visible) {
            this.#stage?.stop();
            return;
        }
        if (this.#state === 'idle') {
            this.#load();
            return;
        }
        if (this.#stage) {
            this.#stage.start();
            this.#show();
        }
    }

    /**
     * Loads the stage, then three only if the browser has WebGL2, then the first gladiator. The stage module comes
     * first because it opens the context: a browser without WebGL never downloads three.
     */
    async #load() {
        this.#state = 'loading';
        this.#setStatus(STATUS.loading);
        try {
            const { CreatorStage } = await import('../render2/creator-stage.js');
            const canvas = createElement(skinStageCanvasTemplate);
            const context = CreatorStage.openContext(canvas);
            if (!context) {
                this.#fail(STATUS.noWebgl);
                return;
            }
            const THREE = await import('three');
            // the page was left while three downloaded
            if (this.#state !== 'loading') {
                context.getExtension('WEBGL_lose_context')?.loseContext();
                return;
            }
            this.#canvas = canvas;
            this.element.replaceChildren(canvas);
            this.on(canvas, 'webglcontextlost', () => {
                if (canvas === this.#canvas) this.#fail(STATUS.failed, new Error('WebGL context lost'));
            });
            const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
            this.#stage = new CreatorStage({ THREE, canvas, context, catalog: images, reducedMotion });
            this.#stage.setMove(this.#move);
            this.#stage.setPlaying(this.#playing);
            if (this.#visible) this.#stage.start();
            await this.#show();
        }
        catch (error) {
            this.#fail(STATUS.failed, error);
        }
    }

    /** Asks the stage for the current skin (when visible); the first one shown swaps the sprite for the 3D view. */
    async #show() {
        const stage = this.#stage;
        if (!stage || !this.#visible) return;
        try {
            const shown = await stage.show(this.#skin);
            if (!shown || stage !== this.#stage || this.#state !== 'loading') return;
            this.#state = 'ready';
            this.#container.classList.add('is-3d');
            this.#setStatus('');
        }
        catch (error) {
            if (stage === this.#stage) this.#fail(STATUS.failed, error);
        }
    }

    /**
     * Gives up on 3D for this visit: the sprite comes back with `message`, the stage and its context are released.
     *
     * @param {string} message Status line.
     * @param {unknown} [error] What went wrong, for the console.
     */
    #fail(message, error = null) {
        if (error) console.warn('Visual 3D do criador indisponível; exibindo o sprite.', error);
        this.#state = 'failed';
        this.#container.classList.remove('is-3d');
        this.#setStatus(message);
        this.#dropStage();
    }

    /** The page is being left: release the WebGL context (a page restored from the back-forward cache starts over). */
    #release() {
        this.#dropStage();
        if (this.#state === 'failed') return;
        this.#state = 'idle';
        this.#container.classList.remove('is-3d');
        this.#setStatus('');
    }

    #dropStage() {
        const stage = this.#stage;
        this.#stage = null;
        this.#canvas = null;
        this.#pointers.clear();
        this.#pinch = null;
        stage?.dispose();
        this.element.replaceChildren();
    }

    /** @param {string} text Status line; empty hides it. */
    #setStatus(text) {
        this.#status.textContent = text;
    }

    /** Drag turns, two fingers pinch-zoom, the wheel zooms, arrow keys turn and + / - zoom. */
    #bindGestures() {
        const host = this.element;
        const spread = () => {
            const [a, b] = [...this.#pointers.values()];
            return Math.hypot(a.x - b.x, a.y - b.y);
        };
        this.on(host, 'pointerdown', event => {
            if (!this.#stage) return;
            host.setPointerCapture?.(event.pointerId);
            this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (this.#pointers.size === 2) this.#pinch = { distance: spread(), zoom: this.#stage.zoom };
            host.classList.add('dragging');
        });
        this.on(host, 'pointermove', event => {
            const last = this.#pointers.get(event.pointerId);
            if (!last || !this.#stage) return;
            const point = { x: event.clientX, y: event.clientY };
            this.#pointers.set(event.pointerId, point);
            if (this.#pinch && this.#pointers.size >= 2) this.#stage.zoomTo(pinchZoom(this.#pinch.zoom, this.#pinch.distance, spread()));
            else if (this.#pointers.size === 1) this.#stage.rotate(dragYaw(point.x - last.x, host.clientWidth));
        });
        const release = event => {
            this.#pointers.delete(event.pointerId);
            if (this.#pointers.size < 2) this.#pinch = null;
            if (!this.#pointers.size) host.classList.remove('dragging');
        };
        this.on(host, 'pointerup', release);
        this.on(host, 'pointercancel', release);
        this.on(host, 'wheel', event => {
            if (!this.#stage) return;
            event.preventDefault();
            this.#stage.zoomTo(wheelZoom(this.#stage.zoom, event.deltaY * (WHEEL_UNITS[event.deltaMode] ?? 1)));
        }, { passive: false });
        this.on(host, 'keydown', event => {
            const stage = this.#stage;
            if (!stage) return;
            const actions = {
                ArrowLeft: () => stage.rotate(-KEY_TURN),
                ArrowRight: () => stage.rotate(KEY_TURN),
                '+': () => stage.zoomBy(ZOOM.step),
                '=': () => stage.zoomBy(ZOOM.step),
                '-': () => stage.zoomBy(-ZOOM.step),
            };
            const action = actions[event.key];
            if (!action) return;
            event.preventDefault();
            action();
        });
    }
}
