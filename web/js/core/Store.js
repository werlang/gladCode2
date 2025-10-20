/**
 * Store - Centralized state management
 * Provides reactive state updates through EventBus
 * 
 * @example
 * const store = new Store({ user: null, gladiators: [] });
 * store.subscribe('user', (user) => console.log('User changed:', user));
 * store.setState('user', { id: 1, name: 'John' });
 */

import EventBus from './EventBus.js';

export default class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.eventBus = new EventBus();
        this.history = [];
        this.maxHistory = 50;
    }

    /**
     * Get a value from the store
     * @param {string} key - State key
     * @returns {any} State value
     */
    getState(key) {
        if (key === undefined) {
            return { ...this.state };
        }
        
        // Support nested keys with dot notation
        return this._getNestedValue(this.state, key);
    }

    /**
     * Set a value in the store
     * @param {string|object} key - State key or object with multiple keys
     * @param {any} [value] - State value (if key is string)
     * @param {boolean} [silent=false] - If true, don't emit events
     */
    setState(key, value, silent = false) {
        // Support setting multiple keys at once
        if (typeof key === 'object') {
            Object.entries(key).forEach(([k, v]) => {
                this._setSingleState(k, v, silent);
            });
            return;
        }
        
        this._setSingleState(key, value, silent);
    }

    /**
     * Set a single state value
     * @private
     */
    _setSingleState(key, value, silent) {
        const oldValue = this.getState(key);
        
        // Support nested keys with dot notation
        this._setNestedValue(this.state, key, value);
        
        // Add to history
        this._addToHistory(key, oldValue, value);
        
        // Emit change event
        if (!silent) {
            this.eventBus.emit(`change:${key}`, value, oldValue);
            this.eventBus.emit('change', key, value, oldValue);
        }
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        return this.eventBus.on(`change:${key}`, callback);
    }

    /**
     * Subscribe to any state change
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
        return this.eventBus.on('change', callback);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} key - State key
     * @param {Function} callback - Callback function
     */
    unsubscribe(key, callback) {
        this.eventBus.off(`change:${key}`, callback);
    }

    /**
     * Reset the store to initial state
     * @param {object} [newState] - New initial state
     */
    reset(newState) {
        const oldState = { ...this.state };
        this.state = newState ? { ...newState } : {};
        this.history = [];
        
        // Emit reset event
        this.eventBus.emit('reset', this.state, oldState);
    }

    /**
     * Get state change history
     * @returns {Array} History array
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Helper to get nested value using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Helper to set nested value using dot notation
     * @private
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    /**
     * Add state change to history
     * @private
     */
    _addToHistory(key, oldValue, newValue) {
        this.history.push({
            key,
            oldValue,
            newValue,
            timestamp: Date.now(),
        });
        
        // Keep history size limited
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
}
