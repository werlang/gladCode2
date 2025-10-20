/**
 * Component - Base class for all UI components
 * Provides lifecycle methods, state management, and DOM rendering
 * 
 * @example
 * class MyComponent extends Component {
 *   constructor(options) {
 *     super(options);
 *     this.state = { count: 0 };
 *   }
 *   
 *   render() {
 *     return `<div class="my-component">
 *       <p>Count: ${this.state.count}</p>
 *       <button data-action="increment">+</button>
 *     </div>`;
 *   }
 *   
 *   addEventListeners() {
 *     this.on('click', '[data-action="increment"]', () => {
 *       this.setState({ count: this.state.count + 1 });
 *     });
 *   }
 * }
 */

export default class Component {
    constructor(options = {}) {
        this.element = null;
        this.state = options.state || {};
        this.props = options.props || {};
        this.parent = options.parent || null;
        this.children = [];
        this.isMounted = false;
        this.eventListeners = [];
    }

    /**
     * Lifecycle: Called before component is mounted
     */
    async beforeMount() {
        // Override in subclass
    }

    /**
     * Mount component to container
     * @param {HTMLElement|string} container - Container element or selector
     */
    async mount(container) {
        if (this.isMounted) {
            console.warn('Component is already mounted');
            return;
        }

        // Get container element
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container)
            : container;

        if (!containerEl) {
            throw new Error(`Container not found: ${container}`);
        }

        // Call before mount hook
        await this.beforeMount();

        // Create and render element
        const html = this.render();
        
        if (typeof html === 'string') {
            containerEl.innerHTML = html;
            this.element = containerEl.firstElementChild || containerEl;
        } else if (html instanceof HTMLElement) {
            containerEl.appendChild(html);
            this.element = html;
        } else {
            throw new Error('render() must return a string or HTMLElement');
        }

        this.isMounted = true;

        // Add event listeners
        this.addEventListeners();

        // Call after mount hook
        await this.afterMount();
    }

    /**
     * Lifecycle: Called after component is mounted
     */
    async afterMount() {
        // Override in subclass
    }

    /**
     * Lifecycle: Called before component is unmounted
     */
    async beforeUnmount() {
        // Override in subclass
    }

    /**
     * Unmount component and cleanup
     */
    async unmount() {
        if (!this.isMounted) {
            return;
        }

        // Call before unmount hook
        await this.beforeUnmount();

        // Unmount children
        for (const child of this.children) {
            await child.unmount();
        }

        // Remove event listeners
        this.removeEventListeners();

        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.isMounted = false;
        this.element = null;
    }

    /**
     * Update component state and re-render
     * @param {object} newState - New state values
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.update();
    }

    /**
     * Update component (re-render)
     */
    update() {
        if (!this.isMounted || !this.element) {
            return;
        }

        const html = this.render();
        
        if (typeof html === 'string') {
            const parent = this.element.parentNode;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const newElement = tempDiv.firstElementChild;
            
            if (parent && newElement) {
                parent.replaceChild(newElement, this.element);
                this.element = newElement;
            }
        } else if (html instanceof HTMLElement) {
            const parent = this.element.parentNode;
            if (parent) {
                parent.replaceChild(html, this.element);
                this.element = html;
            }
        }

        // Re-add event listeners
        this.removeEventListeners();
        this.addEventListeners();
    }

    /**
     * Render component to HTML
     * @returns {string|HTMLElement} HTML string or element
     */
    render() {
        return '<div></div>';
    }

    /**
     * Add event listeners (override in subclass)
     */
    addEventListeners() {
        // Override in subclass
    }

    /**
     * Helper to add event listener with delegation
     * @param {string} event - Event type
     * @param {string} selector - CSS selector for delegation
     * @param {Function} handler - Event handler
     */
    on(event, selector, handler) {
        const wrappedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && this.element.contains(target)) {
                handler.call(this, e, target);
            }
        };

        this.element.addEventListener(event, wrappedHandler);
        this.eventListeners.push({ event, handler: wrappedHandler });
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        if (this.element) {
            for (const { event, handler } of this.eventListeners) {
                this.element.removeEventListener(event, handler);
            }
        }
        this.eventListeners = [];
    }

    /**
     * Find element within component
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null}
     */
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    /**
     * Find all elements within component
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    findAll(selector) {
        return this.element ? this.element.querySelectorAll(selector) : [];
    }

    /**
     * Add child component
     * @param {Component} component - Child component
     */
    addChild(component) {
        this.children.push(component);
        component.parent = this;
    }

    /**
     * Remove child component
     * @param {Component} component - Child component
     */
    removeChild(component) {
        const index = this.children.indexOf(component);
        if (index > -1) {
            this.children.splice(index, 1);
            component.parent = null;
        }
    }
}
