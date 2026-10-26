import { splitDuration } from '../helpers/date-format.js';

/** Markup of the hours:minutes:seconds display, styled by css/tournament.css. */
export const countdownDigitsTemplate = `
<div id='time'>
    <div class='numbers'><span>-</span><span>-</span></div>:
    <div class='numbers'><span>-</span><span>-</span></div>:
    <div class='numbers'><span>-</span><span>-</span></div>
</div>
<div id='text'><span>HRS</span><span>MIN</span><span>SEG</span></div>`;

/**
 * Counts down to a server deadline in a `.timeleft` box, measured against the
 * server's clock so a wrong local clock does not matter.
 *
 * @example
 * new Countdown(box, { deadline, now, onTick: left => ..., onEnd: () => refresh() }).start();
 */
export class Countdown {
    #element;
    #remaining;
    #startedAt = 0;
    #timer = null;
    #onTick;
    #onEnd;

    /**
     * @param {HTMLElement} element The `.timeleft` box holding the digits.
     * @param {object} options
     * @param {string|number|Date} options.deadline Deadline in server time.
     * @param {string|number|Date} options.now The server's time when it answered.
     * @param {(left: number, parts: string[]) => void} [options.onTick] Every second, with the ms left.
     * @param {() => void} [options.onEnd] When the deadline passes.
     */
    constructor(element, { deadline, now, onTick, onEnd }) {
        this.#element = element;
        this.#remaining = new Date(deadline) - new Date(now);
        this.#onTick = onTick;
        this.#onEnd = onEnd;
    }

    /** @returns {number} Milliseconds left. */
    get left() {
        return this.#remaining - (Date.now() - this.#startedAt);
    }

    /**
     * Starts (or restarts) the countdown.
     *
     * @returns {this}
     */
    start() {
        this.stop();
        this.#startedAt = Date.now();
        this.#tick();
        return this;
    }

    /** Stops the countdown. */
    stop() {
        clearTimeout(this.#timer);
        this.#timer = null;
    }

    /**
     * Shows a time on the digits.
     *
     * @param {string[]} parts Hours, minutes and seconds.
     */
    show(parts) {
        this.#element?.querySelectorAll('.numbers').forEach((number, index) => {
            const [tens, units] = number.querySelectorAll('span');
            [tens.textContent, units.textContent] = parts[index];
        });
    }

    #tick() {
        const left = this.left;
        const parts = splitDuration(left);
        this.show(parts);
        this.#onTick?.(left, parts);

        if (left > 0) {
            // align to the next whole second of the countdown
            this.#timer = setTimeout(() => this.#tick(), ((left % 1000) || 1000));
        }
        else {
            this.#onEnd?.();
        }
    }
}
