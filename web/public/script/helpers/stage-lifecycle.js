/**
 * What the status line under the creator's 3D view says while it loads, or why the sprite stays.
 */
export const STAGE_STATUS = Object.freeze({
    loading: 'Carregando visual 3D…',
    noWebgl: 'Este navegador não mostra 3D. Exibindo o sprite.',
    failed: 'Visual 3D indisponível. Exibindo o sprite.',
});

/**
 * The life of the gladiator creator's 3D view, without the browser parts (`editor/skin-preview-3d.js` passes them):
 * `idle` until the view first shows, `loading` while the stage and the first gladiator load, `ready` once it is on
 * screen, `failed` for the rest of the visit (the sprite stays). Nothing loads while the view is hidden, the stage
 * runs only while it is visible, and the WebGL context is released on every way out: a failed load, a lost context,
 * the page being left.
 *
 * @example
 * const lifecycle = new StageLifecycle({ openView, createStage, onChange: ({ state, status }) => render(state, status) });
 * lifecycle.setVisible(true);
 */
export class StageLifecycle {
    #openView;
    #createStage;
    #onChange;
    #warn;
    #state = 'idle';
    #status = '';
    #visible = false;
    /** The opened canvas and context (`openView`), and the stage drawing on it (`createStage`). */
    #view = null;
    #stage = null;
    #skin = [];
    #move = 'walk';
    #playing = false;

    /**
     * @param {{
     *   openView: () => Promise<{ release: () => void }|null>,
     *   createStage: (view: object) => Promise<{ show: (skin: string[]) => Promise<boolean>, setMove: Function, setPlaying: Function, start: Function, stop: Function, dispose: Function }>,
     *   onChange?: (change: { state: string, status: string }) => void,
     *   warn?: (message: string, error: unknown) => void,
     * }} parts `openView` opens the canvas and its WebGL context (null without WebGL; `release` frees the context and
     *   may be called more than once), `createStage` builds the stage on it, `onChange` hears every state and status
     *   change, `warn` reports failures (the console by default).
     */
    constructor({ openView, createStage, onChange = () => {}, warn = (message, error) => console.warn(message, error) }) {
        this.#openView = openView;
        this.#createStage = createStage;
        this.#onChange = onChange;
        this.#warn = warn;
    }

    /** @returns {'idle'|'loading'|'ready'|'failed'} */
    get state() {
        return this.#state;
    }

    /** @returns {string} The status line (empty once the 3D view is on screen). */
    get status() {
        return this.#status;
    }

    /** @returns {object|null} The stage, once it is built (gestures act on it). */
    get stage() {
        return this.#stage;
    }

    /** @param {string[]} skin Worn layer ids; shown as soon as the view is visible. */
    setSkin(skin) {
        this.#skin = [...skin];
        this.#show();
    }

    /** @param {string} move Creator animation. */
    setMove(move) {
        this.#move = move;
        this.#stage?.setMove(move);
    }

    /** @param {boolean} playing Whether the animation plays. */
    setPlaying(playing) {
        this.#playing = playing;
        this.#stage?.setPlaying(playing);
    }

    /**
     * The view came on screen (load it the first time, run it) or left it (stop it).
     *
     * @param {boolean} visible Whether the view is on screen.
     */
    setVisible(visible) {
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
     * The WebGL context of `view` was lost: give up on 3D, unless that view was already let go.
     *
     * @param {object} view A view from `openView`.
     */
    lost(view) {
        if (view === this.#view) this.fail(STAGE_STATUS.failed, new Error('WebGL context lost'));
    }

    /**
     * Gives up on 3D for this visit: the stage and its context are released and the status explains why.
     *
     * @param {string} status Status line.
     * @param {unknown} [error] What went wrong, for the console.
     */
    fail(status, error = null) {
        if (error) this.#warn('Visual 3D do criador indisponível; exibindo o sprite.', error);
        this.#drop();
        this.#set('failed', status);
    }

    /** The page is being left: release the context. A page restored from the back-forward cache loads again. */
    release() {
        this.#drop();
        if (this.#state !== 'failed') this.#set('idle', '');
    }

    /** Opens the view, builds the stage, shows the first gladiator; any failure releases what was opened. */
    async #load() {
        this.#set('loading', STAGE_STATUS.loading);
        try {
            const view = await this.#openView();
            if (!view) {
                this.fail(STAGE_STATUS.noWebgl);
                return;
            }
            // the page was left while the stage module loaded
            if (this.#state !== 'loading') {
                view.release();
                return;
            }
            this.#view = view;
            const stage = await this.#createStage(view);
            // released or failed while three loaded: this stage is not wanted any more
            if (this.#view !== view) {
                stage.dispose();
                view.release();
                return;
            }
            this.#stage = stage;
            stage.setMove(this.#move);
            stage.setPlaying(this.#playing);
            if (this.#visible) stage.start();
            await this.#show();
        }
        catch (error) {
            this.fail(STAGE_STATUS.failed, error);
        }
    }

    /** Asks the stage for the current skin while visible; the first one shown makes the view ready. */
    async #show() {
        const stage = this.#stage;
        if (!stage || !this.#visible) return;
        try {
            const shown = await stage.show(this.#skin);
            if (shown && stage === this.#stage && this.#state === 'loading') this.#set('ready', '');
        }
        catch (error) {
            if (stage === this.#stage) this.fail(STAGE_STATUS.failed, error);
        }
    }

    /** Disposes the stage, then releases the context whatever the stage managed to do. */
    #drop() {
        const stage = this.#stage;
        const view = this.#view;
        this.#stage = null;
        this.#view = null;
        try {
            stage?.dispose();
        }
        finally {
            view?.release();
        }
    }

    #set(state, status) {
        this.#state = state;
        this.#status = status;
        this.#onChange({ state, status });
    }
}
