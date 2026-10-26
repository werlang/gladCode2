/** Milliseconds per unit of the `'1h'`-style expiry strings. */
const UNIT_MS = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    M: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
};

/**
 * A localStorage entry with an optional expiry time.
 *
 * Storage can be unavailable (private windows, blocked site data), so every
 * access is guarded and a missing store reads as empty.
 *
 * @example
 * const prefs = new LocalData({ id: 'prefs' });
 * prefs.set({ data: { theme: 'dark' }, expires: '1d' });
 * prefs.get(); // { theme: 'dark' } until tomorrow, then null
 */
export class LocalData {
    /**
     * @param {{ id: string, data?: unknown, expires?: number|string|Date|false }} options
     */
    constructor({ id, data, expires } = {}) {
        this.id = id;
        this.data = data;
        this.expires = expires ? LocalData.formatExpires(expires) : false;
    }

    /**
     * Reads the stored value, dropping it when it has expired.
     *
     * @returns {unknown} The stored data, or the instance data when nothing is stored.
     */
    get() {
        try {
            const stored = localStorage.getItem(this.id);
            if (stored) {
                const { data, expires } = JSON.parse(stored);
                this.data = data;
                this.expires = expires;
                this.check();
            }
        }
        catch {
            // Unreadable storage or a corrupt entry reads as nothing stored.
        }
        return this.data;
    }

    /**
     * Stores the value.
     *
     * @param {{ id?: string, data?: unknown, expires?: number|string|Date }} [options]
     * @returns {boolean} Whether the value was written.
     */
    set({ id, data, expires } = {}) {
        if (id) this.id = id;
        if (data !== undefined) this.data = data;
        if (expires) this.expires = LocalData.formatExpires(expires);

        try {
            localStorage.setItem(this.id, JSON.stringify({ data: this.data, expires: this.expires }));
            return true;
        }
        catch {
            return false;
        }
    }

    /**
     * Reports whether the data is still valid, removing it when it expired.
     *
     * @returns {boolean}
     */
    check() {
        if (!this.data) return false;
        if (this.expires === false || this.expires > Date.now()) return true;

        this.remove();
        return false;
    }

    /** Deletes the stored value. */
    remove() {
        this.data = null;
        try {
            localStorage.removeItem(this.id);
        }
        catch {
            // Nothing to remove when storage is unavailable.
        }
    }

    /**
     * Extends the expiry time.
     *
     * @param {number} time Milliseconds to add.
     */
    addTime(time) {
        this.expires = (this.expires === false ? Date.now() : this.expires) + time;
        this.set();
    }

    /**
     * Converts `'30s'`, `'1h'`, `'2d'`, `'1w'`, `'1M'`, `'1y'`, a `Date` or a
     * timestamp into an expiry timestamp.
     *
     * @param {number|string|Date} expires Expiry.
     * @returns {number} Timestamp in milliseconds.
     * @throws {Error} When the format is not recognised.
     */
    static formatExpires(expires) {
        if (typeof expires === 'string') {
            const value = parseInt(expires.slice(0, -1), 10);
            const unit = UNIT_MS[expires.slice(-1)];
            if (Number.isNaN(value) || !unit) {
                throw new Error('Invalid expiration time');
            }
            return Date.now() + value * unit;
        }
        if (expires instanceof Date) return expires.getTime();
        if (typeof expires === 'number') return Math.trunc(expires);
        throw new Error('Invalid expiration time');
    }
}
