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
 *
 * A failure that can never succeed on this page (no WebGL2, no `three`) breaks the service for good; a
 * failure of one look (a missing FBX, a canvas that will not encode) only falls back for that card, so the
 * other gladiators keep their portraits.
 */
export class CardPortraitService {
    #document;
    #getContext;
    #requestFrame;
    #cache;
    #renderPortrait;
    #sources = new Lru(PORTRAIT_MEMORY_LIMIT, { onEvict: url => this.#revoke(url) });
    #pending = new Map();
    #queue = [];
    /** The job the pump is drawing right now, answered early when the service is disposed. */
    #current = null;
    #pumping = false;
    #THREE = null;
    #renderer = null;
    #library = null;
    #appearance = null;
    #idle = 0;
    /** A permanent failure: never try to draw again on this page. */
    #broken = false;
    /** `dispose()` ran (pagehide or manually); `pageshow` rearms a page restored from the bfcache. */
    #disposed = false;
    #warned = false;
    #observer = null;
    #visible = new WeakMap();
    /** @type {Set<{ target: Element, settle: () => void }>} Cards waiting to come near the viewport. */
    #waiters = new Set();
    #listening = false;
    #pagehideAttached = false;

    /**
     * @param {{
     *   document?: Document,
     *   getContext?: (canvas: HTMLCanvasElement, type: string, attributes?: WebGLContextAttributes) => WebGL2RenderingContext|null,
     *   requestFrame?: (callback: FrameRequestCallback) => number,
     *   cache?: PortraitCache,
     *   render?: (job: { tokens: string[], pose: 'idle'|'dead' }) => Promise<HTMLCanvasElement>,
     * }} [options] Test seams: the page's document, the WebGL context factory, the frame scheduler, the cache
     *   and the drawing call (so a test can fail one look without loading three).
     */
    constructor({ document: documentRef = globalThis.document ?? null, getContext, requestFrame, cache, render } = {}) {
        this.#document = documentRef;
        this.#getContext = getContext ?? ((canvas, type, attributes) => canvas.getContext(type, attributes));
        this.#requestFrame = requestFrame ?? (typeof globalThis.requestAnimationFrame === 'function'
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : callback => setTimeout(() => callback(Date.now()), 0));
        this.#cache = cache ?? new PortraitCache();
        this.#renderPortrait = render ?? null;
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
            if (this.#isUnavailable()) {
                const stored = await this.#cachedImage(key);
                return stored ?? this.#placeholder();
            }
            if (target && this.#watchable(target)) await this.#whenVisible(target);
            if (this.#isUnavailable()) {
                const stored = await this.#cachedImage(key);
                return stored ?? this.#placeholder();
            }
            const url = await this.#load(key, tokens, pose, target);
            return url ? this.#image(url) : this.#placeholder();
        }
        catch (error) {
            return this.#placeholder(error);
        }
    }

    /**
     * Releases the WebGL context and drops the queued work (also called on `pagehide`). Every card still
     * waiting for a portrait is answered with the placeholder; a `pageshow` of a page restored from the
     * bfcache rearms the service.
     */
    dispose() {
        this.#disposed = true;
        this.#releaseContext();
        this.#observer?.disconnect();
        this.#observer = null;
        for (const waiter of [...this.#waiters]) waiter.settle();
        this.#waiters.clear();
        this.#visible = new WeakMap();
        for (const entry of [...this.#pending.values()]) entry.settle(null);
        this.#pending.clear();
        for (const job of this.#queue.splice(0)) job.resolve(null);
        this.#current?.resolve(null);
        this.#current = null;
        this.#sources.clear();
    }

    /** @returns {boolean} True while nothing can or should be painted. */
    #isUnavailable() {
        return this.#disposed || this.#broken;
    }

    /**
     * The URL of a portrait: IndexedDB first, then a fresh render. Concurrent cards of one look share it.
     *
     * @param {string} key
     * @param {string[]} tokens
     * @param {'idle'|'dead'} pose
     * @param {Element|null} target The card image, dropped when it leaves the page before its turn.
     * @returns {Promise<string|null>} An object URL, or null when the card no longer needs one.
     */
    async #load(key, tokens, pose, target) {
        const known = this.#pending.get(key);
        if (known) return known.promise;

        let active = true;
        let settle = null;
        const promise = new Promise((resolve, reject) => {
            settle = (url, error) => {
                if (!active) {
                    // dispose() answered the card first: the late picture has no reader
                    this.#revoke(url);
                    return;
                }
                active = false;
                this.#pending.delete(key);
                if (error) {
                    reject(error);
                    return;
                }
                if (url) this.#sources.set(key, url);
                resolve(url ?? null);
            };
        });
        this.#pending.set(key, { promise, settle });
        this.#paint(key, tokens, pose, target).then(
            url => settle(url),
            error => settle(null, error),
        );
        return promise;
    }

    /** @returns {Promise<string|null>} An object URL of the painted portrait. */
    async #paint(key, tokens, pose, target) {
        try {
            const stored = await this.#cached(key);
            if (stored) return stored;
            if (this.#isUnavailable()) return null;
            const canvas = await this.#queueRender({ tokens, pose, target });
            if (!canvas) return null;
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
        try {
            await decodeImage(this.#document, url);
            return url;
        }
        catch (error) {
            this.#revoke(url);
            throw error;
        }
    }

    /**
     * Queues a render and resolves with its canvas once its turn arrives.
     *
     * @param {{ tokens: string[], pose: 'idle'|'dead', target: Element|null }} job
     * @returns {Promise<HTMLCanvasElement|null>} Null when the card left the page or the service went away.
     */
    #queueRender(job) {
        if (this.#isUnavailable()) return Promise.resolve(null);
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
                // a card removed from the page before its turn needs no picture
                if (this.#isUnavailable() || job.target?.isConnected === false) {
                    job.resolve(null);
                    continue;
                }
                this.#current = job;
                try {
                    const canvas = await this.#render(job);
                    job.resolve(canvas);
                }
                catch (error) {
                    job.reject(error);
                }
                finally {
                    this.#current = null;
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
        if (this.#renderPortrait) return this.#renderPortrait({ tokens, pose });

        let engine;
        try {
            engine = await this.#engine();
        }
        catch (error) {
            // no WebGL2 or no three: no card on this page can be drawn
            this.#break(error);
            throw error;
        }
        const { THREE, renderer } = engine;
        if (!this.#library) {
            try {
                const [synty, palette] = await Promise.all([import('./synty-model.js'), import('./palette.js')]);
                this.#library = new synty.SyntyLibrary(THREE);
                this.#appearance = palette.getAppearance;
            }
            catch (error) {
                this.#break(error);
                throw error;
            }
        }
        const look = this.#appearance(tokens, 0, new Map());
        // prepare rejects for a missing pack file, but a partial install (or one look's gear) must not break
        // the other cards, so only the engine and the library import are treated as page-wide failures
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
        this.#attachLifecycle();
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.#renderer = null;
        });
        return { THREE, renderer };
    }

    /** Listens for the page going away once a portrait was drawn, and for its return from the bfcache. */
    #attachLifecycle() {
        if (typeof globalThis.addEventListener !== 'function') return;
        if (!this.#listening) {
            this.#listening = true;
            globalThis.addEventListener('pageshow', this.#onPageShow);
        }
        if (this.#pagehideAttached) return;
        this.#pagehideAttached = true;
        globalThis.addEventListener('pagehide', this.#onPageHide, { once: true });
    }

    /** A page in the bfcache lost its context; a restored page rearms the service and listens again. */
    #onPageShow = (event) => {
        if (!event?.persisted || !this.#disposed) return;
        this.#disposed = false;
        this.#attachLifecycle();
    };

    #onPageHide = () => {
        this.#pagehideAttached = false;
        this.dispose();
    };

    /** Starts the idle countdown that frees the GL context. */
    #scheduleIdle() {
        clearTimeout(this.#idle);
        if (this.#disposed) {
            this.#idle = 0;
            return;
        }
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
                const waiters = this.#visible.get(entry.target);
                if (!waiters) continue;
                // a card that left the page needs no picture; one that only scrolled away waits for its return
                if (entry.isIntersecting || entry.target.isConnected === false) this.#release(entry.target, waiters);
            }
            this.#sweepWaiters();
        }, { rootMargin: VISIBLE_MARGIN });
        this.#sweepWaiters();
        return new Promise((resolve) => {
            const waiter = {
                target,
                settle: () => {
                    this.#waiters.delete(waiter);
                    const group = this.#visible.get(target);
                    if (!group) return resolve();
                    group.delete(waiter);
                    if (!group.size) this.#release(target, group);
                    resolve();
                },
            };
            let group = this.#visible.get(target);
            if (!group) {
                // a WeakMap key, so a card removed before it shows never keeps the page from collecting it
                group = new Set();
                this.#visible.set(target, group);
            }
            group.add(waiter);
            this.#waiters.add(waiter);
            this.#observer.observe(target);
            this.#sweepWaiters();
        });
    }

    /**
     * Answers every waiter of a card at once.
     *
     * @param {Element} target
     * @param {Set<{ settle: () => void }>} waiters
     */
    #release(target, waiters) {
        this.#visible.delete(target);
        this.#observer?.unobserve(target);
        for (const waiter of [...waiters]) waiter.settle();
    }

    /** Answers the cards removed from the page before any wait of theirs could finish. */
    #sweepWaiters() {
        for (const waiter of [...this.#waiters]) {
            if (waiter.target.isConnected === false) waiter.settle();
        }
    }

    /** @param {Element|null} target @returns {boolean} */
    #watchable(target) {
        return Boolean(target) && target.isConnected !== false && typeof globalThis.IntersectionObserver === 'function';
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

    /** Warns once per page that a card fell back to the placeholder. */
    #fail(error) {
        if (this.#warned) return;
        this.#warned = true;
        console.warn('Card portraits are unavailable; showing the placeholder picture.', error);
    }

    /** Marks a failure no later card can recover from and warns once. */
    #break(error) {
        this.#broken = true;
        this.#fail(error);
    }

    /**
     * Releases an object URL the service no longer hands out.
     *
     * @param {unknown} url
     */
    #revoke(url) {
        if (typeof url !== 'string' || !url.startsWith('blob:')) return;
        try {
            URL.revokeObjectURL(url);
        }
        catch {
            // the browser already released it
        }
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
