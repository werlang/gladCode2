/**
 * DOM utility functions
 * Helper functions for DOM manipulation without jQuery
 */

/**
 * Create an element from HTML string
 * @param {string} html - HTML string
 * @returns {HTMLElement}
 */
export function createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

/**
 * Query selector wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element
 * @returns {HTMLElement|null}
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Query selector all wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element
 * @returns {NodeList}
 */
export function $$(selector, context = document) {
    return context.querySelectorAll(selector);
}

/**
 * Add event listener with delegation
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {string} selector - Selector for delegation
 * @param {Function} handler - Event handler
 */
export function on(element, event, selector, handler) {
    element.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && element.contains(target)) {
            handler.call(target, e);
        }
    });
}

/**
 * Add class to element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name
 */
export function addClass(element, className) {
    element.classList.add(className);
}

/**
 * Remove class from element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name
 */
export function removeClass(element, className) {
    element.classList.remove(className);
}

/**
 * Toggle class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name
 * @param {boolean} force - Force add/remove
 */
export function toggleClass(element, className, force) {
    element.classList.toggle(className, force);
}

/**
 * Check if element has class
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element.classList.contains(className);
}

/**
 * Get/set element attribute
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @param {string} [value] - Attribute value (if setting)
 * @returns {string|void}
 */
export function attr(element, name, value) {
    if (value === undefined) {
        return element.getAttribute(name);
    }
    element.setAttribute(name, value);
}

/**
 * Remove element attribute
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 */
export function removeAttr(element, name) {
    element.removeAttribute(name);
}

/**
 * Get/set element data attribute
 * @param {HTMLElement} element - Target element
 * @param {string} key - Data key
 * @param {any} [value] - Data value (if setting)
 * @returns {any}
 */
export function data(element, key, value) {
    if (value === undefined) {
        return element.dataset[key];
    }
    element.dataset[key] = value;
}

/**
 * Get/set element HTML
 * @param {HTMLElement} element - Target element
 * @param {string} [html] - HTML content (if setting)
 * @returns {string|void}
 */
export function html(element, html) {
    if (html === undefined) {
        return element.innerHTML;
    }
    element.innerHTML = html;
}

/**
 * Get/set element text
 * @param {HTMLElement} element - Target element
 * @param {string} [text] - Text content (if setting)
 * @returns {string|void}
 */
export function text(element, text) {
    if (text === undefined) {
        return element.textContent;
    }
    element.textContent = text;
}

/**
 * Show element
 * @param {HTMLElement} element - Target element
 */
export function show(element) {
    element.style.display = '';
    element.removeAttribute('hidden');
}

/**
 * Hide element
 * @param {HTMLElement} element - Target element
 */
export function hide(element) {
    element.style.display = 'none';
}

/**
 * Check if element is visible
 * @param {HTMLElement} element - Target element
 * @returns {boolean}
 */
export function isVisible(element) {
    return element.offsetParent !== null;
}

/**
 * Get element offset relative to document
 * @param {HTMLElement} element - Target element
 * @returns {object} Offset {top, left}
 */
export function offset(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
    };
}

/**
 * Scroll to element
 * @param {HTMLElement} element - Target element
 * @param {object} options - Scroll options
 */
export function scrollTo(element, options = {}) {
    element.scrollIntoView({
        behavior: options.smooth ? 'smooth' : 'auto',
        block: options.block || 'start',
        inline: options.inline || 'nearest',
    });
}

/**
 * Wait for DOM ready
 * @returns {Promise}
 */
export function ready() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    });
}

/**
 * Animate element (simple animation helper)
 * @param {HTMLElement} element - Target element
 * @param {object} keyframes - Animation keyframes
 * @param {object} options - Animation options
 * @returns {Animation}
 */
export function animate(element, keyframes, options = {}) {
    return element.animate(keyframes, {
        duration: options.duration || 300,
        easing: options.easing || 'ease',
        fill: options.fill || 'forwards',
        ...options,
    });
}
