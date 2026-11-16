/**
 * Cache identity and storage for the 3D gladiator portraits: a pure key (the LPC tokens in any order, the
 * pose, the renderer version and the size), a small in-memory LRU and an IndexedDB store of 256 px WebP
 * pictures trimmed to the newest {@link PORTRAIT_CACHE_LIMIT}. DOM-free, and safe where IndexedDB does not
 * exist: the store then simply holds nothing and every call is a miss.
 */

/** Bump whenever the portrait renderer changes what a picture looks like. */
export const PORTRAIT_VERSION = 1;
/** Side of the square portrait, in pixels (part of the cache key). */
export const PORTRAIT_SIZE = 256;
/** Pictures kept in IndexedDB; the least recently used are evicted first. */
export const PORTRAIT_CACHE_LIMIT = 300;
/** Pictures kept in memory by the card service (distinct looks a page shows at once). */
export const PORTRAIT_MEMORY_LIMIT = 24;

const DB_NAME = 'gladcode-portraits';
const STORE = 'portraits';

/**
 * The LPC tokens of a persisted skin: a token array, or the JSON string the API stores.
 *
 * @param {unknown} skin
 * @returns {string[]} The tokens, without empty entries.
 */
export function skinTokens(skin) {
    if (Array.isArray(skin)) return skin.map(String).filter(Boolean);
    try {
        const parsed = JSON.parse(String(skin ?? '[]'));
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    }
    catch {
        return [];
    }
}

/**
 * A stable identity of a set of worn layers, whatever their order.
 *
 * @param {string[]} tokens LPC tokens.
 * @returns {string} The sorted tokens joined by `|`.
 */
export function skinKey(tokens) {
    return [...tokens].map(String).sort().join('|');
}

/**
 * The cache key of a portrait: `skinKey(tokens)|pose|PORTRAIT_VERSION|size`.
 *
 * @param {string[]} tokens LPC tokens.
 * @param {{ pose?: 'idle'|'dead', version?: number, size?: number }} [options]
 * @returns {string}
 */
export function portraitKey(tokens, { pose = 'idle', version = PORTRAIT_VERSION, size = PORTRAIT_SIZE } = {}) {
    return `${skinKey(tokens)}|${pose}|${version}|${size}`;
}

/**
 * The keys to delete so a store keeps its newest `limit` records, oldest use first.
 *
 * @param {Array<{ key: string, usedAt?: number }>} records Records with their last use.
 * @param {number} [limit] Records to keep.
 * @returns {string[]} Keys to evict, oldest first; empty while the store fits.
 */
export function evictionVictims(records, limit = PORTRAIT_CACHE_LIMIT) {
    if (records.length <= limit) return [];
    return [...records]
        .sort((a, b) => (Number(a.usedAt) || 0) - (Number(b.usedAt) || 0) || String(a.key).localeCompare(String(b.key)))
        .slice(0, records.length - Math.max(0, limit))
        .map(record => record.key);
}

/** A Map with a size limit that forgets the least recently used entry first. */
export class Lru {
    #limit;
    #entries = new Map();

    /** @param {number} limit Entries to keep (at least one). */
    constructor(limit) {
        this.#limit = Math.max(1, Math.trunc(limit));
    }

    /**
     * Reads a value and marks it as the most recently used.
     *
     * @param {string} key
     * @returns {unknown} The value, or undefined.
     */
    get(key) {
        if (!this.#entries.has(key)) return undefined;
        const value = this.#entries.get(key);
        this.#entries.delete(key);
        this.#entries.set(key, value);
        return value;
    }

    /**
     * Writes a value as the most recently used, evicting the oldest entry when full.
     *
     * @param {string} key
     * @param {unknown} value
     * @returns {unknown} The value.
     */
    set(key, value) {
        this.#entries.delete(key);
        this.#entries.set(key, value);
        while (this.#entries.size > this.#limit) this.#entries.delete(this.#entries.keys().next().value);
        return value;
    }

    /** @param {string} key */
    delete(key) {
        this.#entries.delete(key);
    }

    clear() {
        this.#entries.clear();
    }

    /** @returns {number} */
    get size() {
        return this.#entries.size;
    }

    /** @returns {string[]} Keys from the oldest to the newest. */
    keys() {
        return [...this.#entries.keys()];
    }
}

/**
 * The IndexedDB store of portrait pictures. Every operation resolves: a browser without IndexedDB, a
 * blocked upgrade or a private-mode refusal simply leaves the cache empty (it is only an optimisation).
 */
export class PortraitCache {
    #factory;
    #databaseName;
    #database;
    #clock = 0;

    /**
     * @param {{ indexedDB?: IDBFactory|null, databaseName?: string }} [options]
     */
    constructor({ indexedDB = globalThis.indexedDB ?? null, databaseName = DB_NAME } = {}) {
        this.#factory = indexedDB;
        this.#databaseName = databaseName;
    }

    /**
     * The picture stored under `key`, marking it as the most recently used.
     *
     * @param {string} key
     * @returns {Promise<Blob|null>}
     */
    async get(key) {
        const db = await this.#open();
        if (!db) return null;
        try {
            const record = await new Promise((resolve) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                const request = store.get(key);
                request.onsuccess = () => {
                    const found = request.result;
                    if (found) store.put({ ...found, usedAt: this.#stamp() });
                    resolve(found ?? null);
                };
                request.onerror = () => resolve(null);
                tx.onabort = () => resolve(null);
            });
            return record?.blob ?? null;
        }
        catch {
            return null;
        }
    }

    /**
     * Stores a picture, then evicts the oldest records beyond {@link PORTRAIT_CACHE_LIMIT}.
     *
     * @param {string} key
     * @param {Blob} blob
     * @returns {Promise<void>}
     */
    async put(key, blob) {
        const db = await this.#open();
        if (!db || !blob) return;
        try {
            await new Promise((resolve) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put({ key, blob, usedAt: this.#stamp() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
                tx.onabort = () => resolve();
            });
            await this.#trim(db);
        }
        catch {
            // the cache is an optimisation: a failed write must never reach the card
        }
    }

    /** @returns {Promise<IDBDatabase|null>} Opened once, null when the browser cannot (or will not) store. */
    #open() {
        if (this.#database !== undefined) return this.#database;
        if (!this.#factory) {
            this.#database = Promise.resolve(null);
            return this.#database;
        }
        this.#database = new Promise((resolve) => {
            try {
                const request = this.#factory.open(this.#databaseName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
            }
            catch {
                resolve(null);
            }
        });
        return this.#database;
    }

    /** Deletes the least recently used records beyond the limit. */
    async #trim(db) {
        try {
            const records = await new Promise((resolve) => {
                const tx = db.transaction(STORE, 'readonly');
                const request = tx.objectStore(STORE).getAll();
                request.onsuccess = () => resolve(request.result ?? []);
                request.onerror = () => resolve([]);
            });
            const victims = evictionVictims(records, PORTRAIT_CACHE_LIMIT);
            if (!victims.length) return;
            await new Promise((resolve) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                for (const key of victims) store.delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
                tx.onabort = () => resolve();
            });
        }
        catch {
            // a failed trim leaves the cache as it was
        }
    }

    /** @returns {number} A use stamp that never repeats within the page. */
    #stamp() {
        this.#clock = (this.#clock + 1) % 1000;
        return Date.now() * 1000 + this.#clock;
    }
}
