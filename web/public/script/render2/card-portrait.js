import {
    Lru, PORTRAIT_MEMORY_LIMIT, PORTRAIT_SIZE, PortraitCache, portraitKey, skinTokens,
} from '../helpers/portrait-cache.js';
import { DEAD_MOTION, IDLE_MOTION, renderSnapshot } from './portrait.js';

/** The picture shown when a portrait cannot be drawn (no WebGL or no Synty pack). */
export const PLACEHOLDER_SRC = '/image/glad-placeholder.svg';
/** Time without a portrait after which the offscreen WebGL context is released. */
export const IDLE_CONTEXT_MS = 10000;
/** How far outside the viewport a card starts warming its portrait. */
const VISIBLE_MARGIN = '160px';

/**
 * The card portrait service: one Synty library and one offscreen WebGL renderer per page, a memory and an
 * IndexedDB cache, and a queue that paints the visible cards one per animation frame. It never rejects at
 * its callers: a failure becomes the placeholder picture plus one console warning per page.
 */
export class CardPortraitService {
    #document;
    #getContext;
    #requestFrame;
    #cache;
    #sources = new Lru(PORTRAIT_MEMORY_LIMIT);
    #pending = new Map();
    #queue = [];
    #pumping = false;
    #THREE = null;
    #renderer = null;
    #library = null;
    #appearance = null;
    #idle = 0;
    #broken = false;
    #warned = false;
    #observer = null;
    #visible = new Map();
    #listening = false;

    /**
     * @param {{
     *   document?: Document,
     *   getContext?: (canvas: HTMLCanvasElement, type: string, attributes?: WebGLContextAttributes) => WebGL2RenderingContext|null,
     *   requestFrame?: (callback: FrameRequestCallback) => number,
     *   cache?: PortraitCache,
     * }} [options] Test seams: the page's document, the WebGL context factory, the frame scheduler and the cache.
     */
    constructor({ document: documentRef = globalThis.document ?? null, getContext, requestFrame, cache } = {}) {
        this.#document = documentRef;
        this.#getContext = getContext ?? ((canvas, type, attributes) => canvas.getContext(type, attributes));
        this.#requestFrame = requestFrame ?? (typeof globalThis.requestAnimationFrame === 'function'
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : callback => setTimeout(() => callback(Date.now()), 0));
        this.#cache = cache ?? new PortraitCache();
    }

    /**
     * A portrait of a gladiator, from the memory cache, IndexedDB, or a fresh Synty render (in that order).
     * Off-viewport cards wait for the IntersectionObserver, so only visible cards are painted.
     *
     * @param {string|string[]} skin LPC tokens, or the persisted skin JSON string.
     * @param {{ pose?: 'idle'|'dead', target?: Element|null }} [options] `target` is the card image to wait to be visible.
     * @returns {Promise<HTMLImageElement>} The portrait, or the placeholder when it cannot be drawn.
     */
    async get(skin, { pose = 'idle', target = null } = {}) {
        try {
            const tokens = skinTokens(skin);
            const key = portraitKey(tokens, { pose });
            const known = this.#sources.get(key);
            if (known) return this.#image(known);
            if (this.#broken) {
                const stored = await this.#cachedImage(key);
                return stored ?? this.#placeholder();
            }
            if (target && this.#watchable(target)) await this.#whenVisible(target);
            if (this.#broken) {
                const stored = await this.#cachedImage(key);
                return stored ?? this.#placeholder();
            }
            return this.#image(await this.#load(key, tokens, pose));
        }
        catch (error) {
            return this.#placeholder(error);
        }
    }

    /** Releases the WebGL context and drops the queued work (also called on `pagehide`). */
    dispose() {
        this.#releaseContext();
        this.#observer?.disconnect();
        this.#visible.clear();
        this.#queue.length = 0;
        this.#pending.clear();
        this.#sources.clear();
        this.#broken = true;
    }

    /**
     * The URL of a portrait: IndexedDB first, then a fresh render.
     *
     * @param {string} key
     * @param {string[]} tokens
     * @param {'idle'|'dead'} pose
     * @returns {Promise<string>} An object URL, shared by every card with this look.
     */
    async #load(key, tokens, pose) {
        if (!this.#pending.has(key)) {
            const pending = this.#paint(key, tokens, pose)
                .then((url) => {
                    this.#sources.set(key, url);
                    this.#pending.delete(key);
                    return url;
                }, (error) => {
                    this.#pending.delete(key);
                    throw error;
                });
            this.#pending.set(key, pending);
        }
        return this.#pending.get(key);
    }

    /** @returns {Promise<string>} An object URL of the painted portrait. */
    async #paint(key, tokens, pose) {
        try {
            const stored = await this.#cached(key);
            if (stored) return stored;
            const canvas = await this.#queueRender({ tokens, pose });
            const blob = await toWebp(canvas);
            await this.#cache.put(key, blob);
            return await this.#adopt(blob);
        }
        catch (error) {
            this.#fail(error);
            throw error;
        }
    }

    /**
     * The picture IndexedDB holds for a key, decoded, or null. A stale or unreadable entry counts as a miss.
     *
     * @param {string} key
     * @returns {Promise<string|null>} An object URL.
     */
    async #cached(key) {
        const stored = await this.#cache.get(key);
        if (!stored) return null;
        try {
            return await this.#adopt(stored);
        }
        catch {
            return null;
        }
    }

    /**
     * The cached picture as a card image, also kept in the memory cache.
     *
     * @param {string} key
     * @returns {Promise<HTMLImageElement|null>}
     */
    async #cachedImage(key) {
        const stored = await this.#cached(key);
        if (!stored) return null;
        this.#sources.set(key, stored);
        return this.#image(stored);
    }

    /**
     * Turns a stored picture into an object URL, decoding it so the card never shows a broken image.
     *
     * @param {Blob} blob
     * @returns {Promise<string>}
     */
    async #adopt(blob) {
        const url = URL.createObjectURL(blob);
        await decodeImage(this.#document, url);
        return url;
    }

    /**
     * Queues a render and resolves with its canvas once its turn arrives.
     *
     * @param {{ tokens: string[], pose: 'idle'|'dead' }} job
     * @returns {Promise<HTMLCanvasElement>}
     */
    #queueRender(job) {
        return new Promise((resolve, reject) => {
            this.#queue.push({ ...job, resolve, reject });
            this.#pump();
        });
    }

    /** Paints queued cards one per animation frame, strictly in series. */
    async #pump() {
        if (this.#pumping) return;
        this.#pumping = true;
        clearTimeout(this.#idle);
        this.#idle = 0;
        try {
            while (this.#queue.length) {
                await this.#nextFrame();
                const job = this.#queue.shift();
                if (!job) continue;
                try {
                    job.resolve(await this.#render(job));
                }
                catch (error) {
                    job.reject(error);
                }
            }
        }
        finally {
            this.#pumping = false;
            this.#scheduleIdle();
        }
    }

    /** @returns {Promise<void>} Resolves on the next animation frame. */
    #nextFrame() {
        return new Promise((resolve) => {
            this.#requestFrame(() => resolve());
        });
    }

    /**
     * Draws one gladiator into a canvas: imports three and the Synty library on the first picture only, then
     * loads whatever gear this look adds. The model is disposed by {@link renderSnapshot}.
     *
     * @param {{ tokens: string[], pose: 'idle'|'dead' }} job
     * @returns {Promise<HTMLCanvasElement>}
     */
    async #render({ tokens, pose }) {
        const { THREE, renderer } = await this.#engine();
        if (!this.#library) {
            const [synty, palette] = await Promise.all([import('./synty-model.js'), import('./palette.js')]);
            this.#library = new synty.SyntyLibrary(THREE);
            this.#appearance = palette.getAppearance;
        }
        const look = this.#appearance(tokens, 0, new Map());
        const create = await this.#library.prepare([look]);
        const model = create({ THREE, look, index: 0 });
        return renderSnapshot(THREE, renderer, model, {
            size: PORTRAIT_SIZE,
            frame: 'body',
            motion: pose === 'dead' ? DEAD_MOTION : IDLE_MOTION,
            document: this.#document,
        });
    }

    /**
     * The page's single offscreen renderer, built on demand. WebGL2 is checked first, so a device without it
     * never downloads three or the Synty library; three itself is imported only past the caches.
     *
     * @returns {Promise<{ THREE: typeof import('three'), renderer: import('three').WebGLRenderer }>}
     */
    async #engine() {
        if (this.#renderer) return { THREE: this.#THREE, renderer: this.#renderer };
        if (!this.#document) throw new Error('Card portraits need a document');
        const canvas = this.#document.createElement('canvas');
        canvas.width = PORTRAIT_SIZE;
        canvas.height = PORTRAIT_SIZE;
        const attributes = { alpha: true, antialias: true, depth: true, preserveDrawingBuffer: false, powerPreference: 'low-power' };
        const context = this.#getContext(canvas, 'webgl2', attributes);
        if (!context) throw new Error('WebGL2 is not available for gladiator portraits');
        const THREE = await import('three');
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
        }
        catch (error) {
            try {
                context.getExtension?.('WEBGL_lose_context')?.loseContext();
            }
            catch {
                // the context may already be gone
            }
            throw error;
        }
        renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE, false);
        renderer.setClearColor(0x000000, 0);
        this.#THREE = THREE;
        this.#renderer = renderer;
        this.#attachPagehide();
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.#renderer = null;
        });
        return { THREE, renderer };
    }

    /** Listens for the page going away once the first portrait was drawn. */
    #attachPagehide() {
        if (this.#listening || typeof globalThis.addEventListener !== 'function') return;
        this.#listening = true;
        globalThis.addEventListener('pagehide', () => this.dispose(), { once: true });
    }

    /** Starts the idle countdown that frees the GL context. */
    #scheduleIdle() {
        clearTimeout(this.#idle);
        const timer = setTimeout(() => this.#releaseContext(), IDLE_CONTEXT_MS);
        // Node's test runner would otherwise wait for this timer; browsers have no unref
        timer?.unref?.();
        this.#idle = timer;
    }

    /** Frees the renderer and its WebGL context; the next portrait builds a new one. */
    #releaseContext() {
        clearTimeout(this.#idle);
        this.#idle = 0;
        const renderer = this.#renderer;
        this.#renderer = null;
        if (!renderer) return;
        try {
            renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();
        }
        catch {
            // the context may already be gone
        }
        renderer.dispose();
    }

    /**
     * Waits until a card image is near the viewport.
     *
     * @param {Element} target The card's `.image` slot.
     * @returns {Promise<void>}
     */
    #whenVisible(target) {
        this.#observer ??= new globalThis.IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const resolve = this.#visible.get(entry.target);
                this.#visible.delete(entry.target);
                this.#observer?.unobserve(entry.target);
                resolve?.();
            }
        }, { rootMargin: VISIBLE_MARGIN });
        return new Promise((resolve) => {
            this.#visible.set(target, resolve);
            this.#observer.observe(target);
        });
    }

    /** @param {Element|null} target @returns {boolean} */
    #watchable(target) {
        return Boolean(target) && typeof globalThis.IntersectionObserver === 'function';
    }

    /**
     * @param {string} src Picture URL.
     * @param {boolean} [placeholder] Adds the `.is-placeholder` class.
     * @returns {HTMLImageElement}
     */
    #image(src, placeholder = false) {
        if (!this.#document) throw new Error('Card portraits need a document');
        const image = this.#document.createElement('img');
        image.alt = '';
        image.decoding = 'async';
        image.src = src;
        if (placeholder) image.classList.add('is-placeholder');
        return image;
    }

    /**
     * The fallback picture. The first failure is logged once; later cards simply reuse the placeholder.
     *
     * @param {unknown} [error]
     * @returns {HTMLImageElement|null}
     */
    #placeholder(error) {
        if (error) this.#fail(error);
        try {
            return this.#image(PLACEHOLDER_SRC, true);
        }
        catch {
            return null;
        }
    }

    /** Marks the service broken and warns once per page. */
    #fail(error) {
        this.#broken = true;
        if (this.#warned) return;
        this.#warned = true;
        console.warn('Card portraits are unavailable; showing the placeholder picture.', error);
    }
}

/**
 * Resolves once the browser decoded an image, so a card never inserts one that fails later.
 *
 * @param {Document} document
 * @param {string} url
 * @returns {Promise<void>}
 */
function decodeImage(document, url) {
    return new Promise((resolve, reject) => {
        const image = document.createElement('img');
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`portrait image failed to load: ${url}`));
        image.src = url;
    });
}

/**
 * Encodes a portrait canvas. Browsers without a WebP encoder answer with their default format (usually PNG),
 * which the cache stores just the same.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function toWebp(canvas) {
    return new Promise((resolve, reject) => {
        if (typeof canvas.toBlob !== 'function') {
            reject(new Error('the portrait canvas cannot be encoded'));
            return;
        }
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('the portrait canvas encoded no picture'));
        }, 'image/webp', 0.9);
    });
}

/** The page's card portrait service. */
export const CardPortraits = new CardPortraitService();
