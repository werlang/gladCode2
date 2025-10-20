/**
 * Storage utility
 * Type-safe wrapper for localStorage and sessionStorage
 */

class Storage {
    constructor(storage) {
        this.storage = storage;
    }

    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @param {any} [defaultValue] - Default value if not found
     * @returns {any}
     */
    get(key, defaultValue = null) {
        try {
            const item = this.storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return defaultValue;
        }
    }

    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    set(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error writing to storage:', error);
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            this.storage.removeItem(key);
        } catch (error) {
            console.error('Error removing from storage:', error);
        }
    }

    /**
     * Clear all items from storage
     */
    clear() {
        try {
            this.storage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    has(key) {
        return this.storage.getItem(key) !== null;
    }

    /**
     * Get all keys from storage
     * @returns {string[]}
     */
    keys() {
        return Object.keys(this.storage);
    }

    /**
     * Get storage size (approximate)
     * @returns {number} Size in bytes
     */
    size() {
        let size = 0;
        for (const key of this.keys()) {
            size += key.length + (this.storage.getItem(key)?.length || 0);
        }
        return size;
    }
}

// Export instances
export const localStorage = new Storage(window.localStorage);
export const sessionStorage = new Storage(window.sessionStorage);

// Export class for custom instances
export default Storage;
