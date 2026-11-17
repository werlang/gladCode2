import { BaseComponent } from '../components/base-component.js';
import { createElement } from '../helpers/html.js';
import { images } from '../helpers/sprite-catalog.js';
import { StageLifecycle } from '../helpers/stage-lifecycle.js';
import { ZOOM, dragYaw, pinchZoom, viewInsets, wheelZoom } from '../render2/creator-view.js';
import { skinStageCanvasTemplate, skinStageTemplate, skinStatusTemplate } from '../templates/editor.js';

/** Turn of one arrow key press (radians). */
const KEY_TURN = Math.PI / 12;
/** Pixels per wheel line and per wheel page, for browsers that scroll in those units. */
const WHEEL_UNITS = [1, 16, 400];
/** The status line when the browser, the WebGL context or the stage cannot show the gladiator. */
const UNAVAILABLE_STATUS = 'Visual 3D indisponível';

/**
 * The 3D gladiator of the creator (`#middle-container`), the preview of the `'3d'` style. `StageLifecycle` decides
 * what runs when (nothing loads until the creator is on screen, the render loop runs only while it is, the WebGL
 * context is released on every failure and when the page is left; until the first gladiator is ready, and for good if
 * it never is, the status line says the 3D view is unavailable while the wardrobe keeps working). This class gives it
 * the browser parts: the canvas and its context, three and the stage, the visibility and page events, the status line,
 * and the gestures.
 *
 * Drag (or the arrow keys) to turn the gladiator, wheel or pinch (or + and -) to zoom; the creator's buttons call
 * {@link SkinPreview3D#turn}, {@link SkinPreview3D#zoomBy}, {@link SkinPreview3D#setPlaying} and
 * {@link SkinPreview3D#setMove}. {@link SkinPreview3D#destroy} unmounts it and releases the WebGL context when the
 * master switches to the sprite style.
 */
export class SkinPreview3D extends BaseComponent {
    #status;
    #controls;
    #lifecycle;
    #visible = false;
    #observer = null;
    #resizeObserver = null;
    #destroyed = false;
    /** Pointers down on the view (by id, last position) and the pinch under way. */
    #pointers = new Map();
    #pinch = null;

    /**
     * @param {HTMLElement} container The creator's `#middle-container`, which holds the preview area.
     * @param {{ controls?: Element[] }} [options] The creator's control rows that run over the view (the view frames the
     *   gladiator clear of them).
     */
    constructor(container, { controls = [] } = {}) {
        super(createElement(skinStageTemplate));
        this.#controls = controls;
        this.#status = createElement(skinStatusTemplate);
        container.append(this.element, this.#status);
        this.#lifecycle = new StageLifecycle({
            openView: () => this.#openView(),
            createStage: view => this.#createStage(view),
            onChange: ({ state, status }) => this.#render(state, status),
        });
        this.#bindGestures();
        // the overlay and the attributes screen hide the view with display: none, which ends the intersection
        this.#observer = new IntersectionObserver(entries => this.#setVisible(entries[entries.length - 1].isIntersecting));
        this.#observer.observe(container);
        // the layout changes between the phone and the desktop creator, and so does what covers the view
        this.#resizeObserver = new ResizeObserver(() => this.#measureInsets());
        this.#resizeObserver.observe(container);
        this.on(window, 'pagehide', () => this.#lifecycle.release());
        this.on(window, 'pageshow', event => {
            if (event.persisted && this.#visible) this.#lifecycle.setVisible(true);
        });
    }

    /**
     * Leaves the creator: stops the stage, releases the WebGL context and removes the view. The creator calls it
     * when the master switches to the sprite style, so the 3D view never keeps a context while it is hidden.
     */
    destroy() {
        if (this.#destroyed) return;
        this.#destroyed = true;
        this.#lifecycle.release();
        this.#observer?.disconnect();
        this.#observer = null;
        this.#resizeObserver?.disconnect();
        this.#resizeObserver = null;
        this.#status.remove();
        super.destroy();
    }

    /** @returns {boolean} Whether the 3D gladiator is on screen (otherwise the status line explains why). */
    get active() {
        return this.#lifecycle.state === 'ready';
    }

    /** @param {string[]} skin Catalogue ids of the worn layers; the gladiator is rebuilt when the view is visible. */
    setSkin(skin) {
        this.#lifecycle.setSkin(skin);
    }

    /** @param {string} move Animation of the creator's animation button (`walk`, `cast`, `thrust`, `slash`, `shoot`). */
    setMove(move) {
        this.#lifecycle.setMove(move);
    }

    /** @param {boolean} playing Whether the animation plays (the creator's play/pause button). */
    setPlaying(playing) {
        this.#lifecycle.setPlaying(playing);
    }

    /** Turns the gladiator to its next facing (the creator's rotate button). */
    turn() {
        this.#lifecycle.stage?.turn();
    }

    /** @param {number} step Zoom change (the creator's zoom buttons). */
    zoomBy(step) {
        this.#lifecycle.stage?.zoomBy(step);
    }

    #setVisible(visible) {
        this.#visible = visible;
        this.#lifecycle.setVisible(visible);
    }

    /**
     * Loads the stage module and opens a WebGL2 context on a new canvas, so a browser without it is found before three
     * is downloaded. `release` loses the context, once.
     */
    async #openView() {
        const { CreatorStage } = await import('../render2/creator-stage.js');
        const canvas = createElement(skinStageCanvasTemplate);
        const context = CreatorStage.openContext(canvas);
        if (!context) return null;
        return {
            CreatorStage,
            canvas,
            context,
            release: () => {
                if (!context.isContextLost()) context.getExtension('WEBGL_lose_context')?.loseContext();
            },
        };
    }

    /** Loads three and builds the stage on the opened view (shown once the first gladiator is ready). */
    async #createStage(view) {
        const THREE = await import('three');
        this.element.replaceChildren(view.canvas);
        this.on(view.canvas, 'webglcontextlost', () => this.#lifecycle.lost(view));
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const stage = new view.CreatorStage({ THREE, canvas: view.canvas, context: view.context, catalog: images, reducedMotion });
        this.#measureInsets(stage);
        return stage;
    }

    /** Shows the lifecycle's state: the canvas goes when the stage does; a failed view says it is unavailable. */
    #render(state, status) {
        // a stage that was still loading when the master switched back to the sprite style
        if (this.#destroyed || !this.element) return;
        this.element.classList.toggle('unavailable', state === 'failed');
        this.#status.textContent = state === 'failed' ? UNAVAILABLE_STATUS : status;
        if (state === 'idle' || state === 'failed') {
            this.element.replaceChildren();
            this.#pointers.clear();
            this.#pinch = null;
        }
        if (state === 'ready') this.#measureInsets();
    }

    /** Tells the stage how much of the view the creator's controls cover (only once the view has a size). */
    #measureInsets(stage = this.#lifecycle.stage) {
        if (this.#destroyed || !this.element) return;
        const view = this.element.getBoundingClientRect();
        if (!stage || !(view.height > 0)) return;
        stage.setInsets(viewInsets(view, this.#controls.map(control => control.getBoundingClientRect())));
    }

    /** Drag turns, two fingers pinch-zoom, the wheel zooms, arrow keys turn and + / - zoom. */
    #bindGestures() {
        const host = this.element;
        const spread = () => {
            const [a, b] = [...this.#pointers.values()];
            return Math.hypot(a.x - b.x, a.y - b.y);
        };
        this.on(host, 'pointerdown', event => {
            const stage = this.#lifecycle.stage;
            if (!stage) return;
            host.setPointerCapture?.(event.pointerId);
            this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (this.#pointers.size === 2) this.#pinch = { distance: spread(), zoom: stage.zoom };
            host.classList.add('dragging');
        });
        this.on(host, 'pointermove', event => {
            const last = this.#pointers.get(event.pointerId);
            const stage = this.#lifecycle.stage;
            if (!last || !stage) return;
            const point = { x: event.clientX, y: event.clientY };
            this.#pointers.set(event.pointerId, point);
            if (this.#pinch && this.#pointers.size >= 2) stage.zoomTo(pinchZoom(this.#pinch.zoom, this.#pinch.distance, spread()));
            else if (this.#pointers.size === 1) stage.rotate(dragYaw(point.x - last.x, host.clientWidth));
        });
        const release = event => {
            this.#pointers.delete(event.pointerId);
            if (this.#pointers.size < 2) this.#pinch = null;
            if (!this.#pointers.size) host.classList.remove('dragging');
        };
        this.on(host, 'pointerup', release);
        this.on(host, 'pointercancel', release);
        this.on(host, 'wheel', event => {
            const stage = this.#lifecycle.stage;
            if (!stage) return;
            event.preventDefault();
            stage.zoomTo(wheelZoom(stage.zoom, event.deltaY * (WHEEL_UNITS[event.deltaMode] ?? 1)));
        }, { passive: false });
        this.on(host, 'keydown', event => {
            const stage = this.#lifecycle.stage;
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
