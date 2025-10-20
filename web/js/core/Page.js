/**
 * Page - Base class for page components
 * Extends Component with routing integration and page-specific features
 * 
 * @example
 * class HomePage extends Page {
 *   constructor(options) {
 *     super({
 *       ...options,
 *       title: 'Home - gladCode',
 *       layout: 'default'
 *     });
 *   }
 *   
 *   render() {
 *     return `<div class="home-page">
 *       <h1>Welcome to gladCode</h1>
 *     </div>`;
 *   }
 * }
 */

import Component from './Component.js';

export default class Page extends Component {
    constructor(options = {}) {
        super(options);
        this.title = options.title || 'gladCode';
        this.layout = options.layout || 'default';
        this.meta = options.meta || {};
        this.requiresAuth = options.requiresAuth || false;
    }

    /**
     * Lifecycle: Called before navigating to this page
     * @param {object} params - Route parameters
     * @param {object} query - Query string parameters
     */
    async beforeNavigate(params = {}, query = {}) {
        this.params = params;
        this.query = query;
        // Override in subclass
    }

    /**
     * Lifecycle: Called after navigating to this page
     */
    async afterNavigate() {
        // Override in subclass
    }

    /**
     * Override mount to call navigate lifecycle hooks
     */
    async mount(container) {
        await this.beforeNavigate(this.params || {}, this.query || {});
        await super.mount(container);
        await this.afterNavigate();
        this.setTitle(this.title);
        this.setMeta(this.meta);
    }

    /**
     * Set page title
     * @param {string} title - Page title
     */
    setTitle(title) {
        document.title = title;
        this.title = title;
    }

    /**
     * Set page meta tags
     * @param {object} meta - Meta tags object
     */
    setMeta(meta) {
        Object.entries(meta).forEach(([name, content]) => {
            let metaTag = document.querySelector(`meta[name="${name}"]`);
            
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.name = name;
                document.head.appendChild(metaTag);
            }
            
            metaTag.content = content;
        });
    }

    /**
     * Get route parameters
     * @returns {object} Route parameters
     */
    getParams() {
        return this.params || {};
    }

    /**
     * Get query string parameters
     * @returns {object} Query parameters
     */
    getQuery() {
        return this.query || {};
    }

    /**
     * Navigate to another route
     * @param {string} path - Route path
     * @param {object} data - Optional data to pass
     */
    navigate(path, data) {
        if (this.router) {
            this.router.navigate(path, data);
        } else {
            window.location.href = path;
        }
    }

    /**
     * Go back in history
     */
    goBack() {
        if (this.router) {
            this.router.back();
        } else {
            window.history.back();
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        // This should be implemented based on your auth system
        // For now, return true. In real app, check with AuthService
        return true;
    }

    /**
     * Show loading state
     * @param {boolean} show - Show or hide loading
     */
    setLoading(show) {
        const loadingEl = this.find('.page-loading');
        if (loadingEl) {
            loadingEl.classList.toggle('hidden', !show);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('Page error:', message);
        // In a real app, show a toast/notification
        // For now, just log it
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Page success:', message);
        // In a real app, show a toast/notification
    }
}
