import { BaseComponent } from './base-component.js';

/**
 * Clamps and snaps a value to the slider's steps.
 *
 * @param {number} value Raw value.
 * @param {{ min: number, max: number, step: number }} range Slider range.
 * @returns {number}
 */
export function snapValue(value, { min, max, step }) {
    const snapped = min + Math.round((value - min) / step) * step;
    // Round away floating point noise from fractional steps.
    const precision = (String(step).split('.')[1] ?? '').length;
    return Math.min(max, Math.max(min, Number(snapped.toFixed(precision))));
}

/**
 * Horizontal slider with one handle, or two for a range, replacing the
 * jQuery UI widget: it renders the same `.ui-slider`, `.ui-slider-range` and
 * `.ui-slider-handle` markup the stylesheets target (base rules in
 * css/ui-slider.css). Handles follow the pointer and the arrow, Page and
 * Home/End keys, and expose the ARIA slider role.
 *
 * @example
 * const mmr = new Slider(element, { min: 0, max: 4000, step: 100, values: [500, 3500], label: String, onChange: search });
 * mmr.values; // [500, 3500]
 */
export class Slider extends BaseComponent {
    #handles = [];
    #range = null;
    #values = [];
    #options;
    #dragging = -1;

    /**
     * @param {HTMLElement} element Container to turn into the slider.
     * @param {object} options
     * @param {number} [options.min] Lowest value (0).
     * @param {number} [options.max] Highest value (100).
     * @param {number} [options.step] Step (1).
     * @param {number} [options.value] Single-handle value.
     * @param {number[]} [options.values] Two handle values, for a range.
     * @param {'min'|boolean} [options.range] `'min'` fills from the start to the handle,
     *   `true` between two handles; defaults to `true` with `values`.
     * @param {(value: number) => string} [options.label] Text shown in each handle.
     * @param {string} [options.ariaLabel] Accessible name of the handles.
     * @param {() => void} [options.onStart] Called when a pointer starts dragging.
     * @param {(value: number|number[]) => void} [options.onSlide] Called while a handle moves.
     * @param {(value: number|number[]) => void} [options.onChange] Called when a move ends.
     */
    constructor(element, options = {}) {
        super(element);
        this.#options = {
            min: 0,
            max: 100,
            step: 1,
            range: options.values ? true : false,
            ...options,
        };
        const { values, value, min } = this.#options;
        this.#values = (values ?? [value ?? min]).map(item => snapValue(item, this.#options));
        this.#render();
        this.#bind();
        this.#update();
    }

    /** @returns {number} The single handle's value (the first one for a range). */
    get value() {
        return this.#values[0];
    }

    /** @param {number} value New value; does not fire the callbacks. */
    set value(value) {
        this.#values[0] = snapValue(value, this.#options);
        this.#update();
    }

    /** @returns {number[]} Every handle's value. */
    get values() {
        return [...this.#values];
    }

    /** @param {number[]} values New values; does not fire the callbacks. */
    set values(values) {
        this.#values = values.map(item => snapValue(item, this.#options));
        this.#update();
    }

    /** @returns {number} The highest value. */
    get max() {
        return this.#options.max;
    }

    /** @param {number} max New highest value. */
    set max(max) {
        this.#options.max = max;
        this.#values = this.#values.map(item => snapValue(item, this.#options));
        this.#update();
    }

    #render() {
        const { range } = this.#options;
        this.element.classList.add('ui-slider', 'ui-slider-horizontal', 'ui-widget', 'ui-widget-content', 'ui-corner-all');
        this.element.replaceChildren();

        if (range) {
            this.#range = document.createElement('div');
            this.#range.className = `ui-slider-range ui-corner-all ui-widget-header${range === 'min' ? ' ui-slider-range-min' : ''}`;
            this.element.append(this.#range);
        }

        this.#handles = this.#values.map(() => {
            const handle = document.createElement('span');
            handle.className = 'ui-slider-handle ui-corner-all ui-state-default';
            handle.tabIndex = 0;
            handle.setAttribute('role', 'slider');
            handle.setAttribute('aria-valuemin', this.#options.min);
            handle.setAttribute('aria-valuemax', this.#options.max);
            if (this.#options.ariaLabel) handle.setAttribute('aria-label', this.#options.ariaLabel);
            this.element.append(handle);
            return handle;
        });
    }

    #bind() {
        this.on(this.element, 'pointerdown', event => this.#startDrag(event));
        this.on(this.element, 'pointermove', event => this.#drag(event));
        this.on(this.element, 'pointerup', event => this.#endDrag(event));
        this.on(this.element, 'pointercancel', event => this.#endDrag(event));
        this.#handles.forEach((handle, index) => {
            this.on(handle, 'keydown', event => this.#key(event, index));
        });
    }

    /**
     * @param {number} clientX Pointer x.
     * @returns {number} The value under the pointer.
     */
    #valueAt(clientX) {
        const { left, width } = this.element.getBoundingClientRect();
        const { min, max } = this.#options;
        const ratio = width ? (clientX - left) / width : 0;
        return snapValue(min + ratio * (max - min), this.#options);
    }

    /**
     * @param {PointerEvent} event
     */
    #startDrag(event) {
        if (event.button !== 0) return;
        event.preventDefault();
        const value = this.#valueAt(event.clientX);
        const handle = event.target.closest?.('.ui-slider-handle');
        this.#dragging = handle
            ? this.#handles.indexOf(handle)
            : this.#nearestHandle(value);
        this.element.setPointerCapture?.(event.pointerId);
        this.#handles[this.#dragging].focus();
        this.#options.onStart?.();
        this.#move(this.#dragging, value);
    }

    /**
     * @param {PointerEvent} event
     */
    #drag(event) {
        if (this.#dragging < 0) return;
        this.#move(this.#dragging, this.#valueAt(event.clientX));
    }

    /**
     * @param {PointerEvent} event
     */
    #endDrag(event) {
        if (this.#dragging < 0) return;
        this.#dragging = -1;
        this.element.releasePointerCapture?.(event.pointerId);
        this.#options.onChange?.(this.#current());
    }

    /**
     * @param {KeyboardEvent} event
     * @param {number} index Handle index.
     */
    #key(event, index) {
        const { min, max, step } = this.#options;
        const big = Math.max(step, (max - min) / 5);
        const value = this.#values[index];
        const next = {
            ArrowLeft: value - step,
            ArrowDown: value - step,
            ArrowRight: value + step,
            ArrowUp: value + step,
            PageDown: value - big,
            PageUp: value + big,
            Home: min,
            End: max,
        }[event.key];
        if (next === undefined) return;

        event.preventDefault();
        if (this.#move(index, snapValue(next, this.#options))) {
            this.#options.onChange?.(this.#current());
        }
    }

    /**
     * @param {number} value Target value.
     * @returns {number} The handle closest to the value.
     */
    #nearestHandle(value) {
        if (this.#values.length === 1) return 0;
        const [low, high] = this.#values;
        if (low === high) return value < low ? 0 : 1;
        return Math.abs(value - low) <= Math.abs(value - high) ? 0 : 1;
    }

    /**
     * Moves a handle, keeping a range's handles in order.
     *
     * @param {number} index Handle index.
     * @param {number} value New value.
     * @returns {boolean} Whether the value changed.
     */
    #move(index, value) {
        let next = value;
        if (this.#values.length === 2) {
            next = index === 0 ? Math.min(next, this.#values[1]) : Math.max(next, this.#values[0]);
        }
        if (next === this.#values[index]) return false;

        this.#values[index] = next;
        this.#update();
        this.#options.onSlide?.(this.#current());
        return true;
    }

    /** @returns {number|number[]} The value, or the values of a range. */
    #current() {
        return this.#values.length === 1 ? this.#values[0] : this.values;
    }

    /** Places the handles and the range and refreshes labels and ARIA values. */
    #update() {
        const { min, max, label, range } = this.#options;
        const percent = value => (max > min ? ((value - min) / (max - min)) * 100 : 0);

        this.#handles.forEach((handle, index) => {
            const value = this.#values[index];
            handle.style.left = `${percent(value)}%`;
            handle.setAttribute('aria-valuenow', value);
            if (label) handle.textContent = label(value);
        });

        if (!this.#range) return;
        if (range === 'min') {
            this.#range.style.left = '0%';
            this.#range.style.width = `${percent(this.#values[0])}%`;
        }
        else {
            const [low, high] = this.#values.map(percent);
            this.#range.style.left = `${low}%`;
            this.#range.style.width = `${high - low}%`;
        }
    }
}
