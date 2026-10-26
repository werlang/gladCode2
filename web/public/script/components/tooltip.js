/** Hover time before a tooltip appears, as jQuery UI was configured. */
const SHOW_DELAY_MS = 700;
/** Gap between the pointer and the tooltip. */
const OFFSET = 15;

/**
 * Page-wide tooltips for every element with a `title`, styled by the
 * `.ui-tooltip` rules (the class jQuery UI used, kept for the stylesheets).
 *
 * The title is held aside while the tooltip shows, so the browser's own
 * tooltip does not appear on top of it.
 */
export class Tooltip {
    static #installed = false;
    #tip = null;
    #target = null;
    #timer = null;
    #lastX = null;
    #lastY = null;
    #titles = new WeakMap();

    /** Installs the page-wide tooltips once. */
    static install() {
        if (Tooltip.#installed) return;
        Tooltip.#installed = true;
        new Tooltip().#listen();
    }

    #listen() {
        document.addEventListener('pointerover', event => this.#enter(event));
        document.addEventListener('pointerout', event => this.#leave(event));
        document.addEventListener('pointermove', event => this.#move(event), { passive: true });
        document.addEventListener('pointerdown', () => this.#hide());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.#hide();
        });
    }

    /**
     * @param {PointerEvent} event
     */
    #enter(event) {
        if (event.pointerType === 'touch') return;
        const target = event.target instanceof Element ? event.target.closest('[title]') : null;
        if (!target || target === this.#target || !target.getAttribute('title')) return;

        this.#hide();
        this.#target = target;
        this.#titles.set(target, target.getAttribute('title'));
        target.removeAttribute('title');

        this.#timer = setTimeout(() => this.#show(event.clientX, event.clientY), SHOW_DELAY_MS);
    }

    /**
     * @param {PointerEvent} event
     */
    #leave(event) {
        if (!this.#target) return;
        const next = event.relatedTarget;
        if (next instanceof Node && this.#target.contains(next)) return;
        this.#hide();
    }

    /**
     * @param {PointerEvent} event
     */
    #move(event) {
        this.#lastX = event.clientX;
        this.#lastY = event.clientY;
        if (this.#tip) this.#place(event.clientX, event.clientY);
    }

    /**
     * @param {number} x Pointer x when the hover started.
     * @param {number} y Pointer y when the hover started.
     */
    #show(x, y) {
        const text = this.#target && this.#titles.get(this.#target);
        if (!text || !this.#target.isConnected) return;

        this.#tip = document.createElement('div');
        this.#tip.className = 'ui-tooltip';
        this.#tip.setAttribute('role', 'tooltip');
        this.#tip.textContent = text;
        document.body.append(this.#tip);
        this.#place(this.#lastX ?? x, this.#lastY ?? y);
    }

    /**
     * Places the tooltip beside the pointer, kept inside the viewport.
     *
     * @param {number} x Pointer x.
     * @param {number} y Pointer y.
     */
    #place(x, y) {
        const { width, height } = this.#tip.getBoundingClientRect();
        const left = Math.min(x + OFFSET, window.innerWidth - width - 4);
        const top = y + OFFSET + height > window.innerHeight ? y - OFFSET - height : y + OFFSET;
        this.#tip.style.left = `${Math.max(4, left) + window.scrollX}px`;
        this.#tip.style.top = `${Math.max(4, top) + window.scrollY}px`;
    }

    /** Removes the tooltip and gives the element its title back. */
    #hide() {
        clearTimeout(this.#timer);
        this.#tip?.remove();
        this.#tip = null;
        if (this.#target) {
            const title = this.#titles.get(this.#target);
            // A script may have set a new title meanwhile; keep that one.
            if (title && !this.#target.hasAttribute('title')) {
                this.#target.setAttribute('title', title);
            }
            this.#titles.delete(this.#target);
        }
        this.#target = null;
    }
}
