/**
 * Router - Client-side routing manager
 * Supports hash-based and History API routing
 * 
 * @example
 * const router = new Router({ mode: 'hash' });
 * router.addRoute('/', HomePage);
 * router.addRoute('/editor', EditorPage);
 * router.start();
 */

export default class Router {
    constructor(options = {}) {
        this.routes = new Map();
        this.currentPage = null;
        this.mode = options.mode || 'hash'; // 'hash' or 'history'
        this.container = options.container || '#app';
        this.notFoundHandler = options.notFoundHandler || null;
        this.beforeNavigateHook = options.beforeNavigate || null;
        this.afterNavigateHook = options.afterNavigate || null;
    }

    /**
     * Add a route
     * @param {string} path - Route path (supports :param for dynamic segments)
     * @param {Class} PageClass - Page class constructor
     * @param {object} options - Route options
     */
    addRoute(path, PageClass, options = {}) {
        this.routes.set(path, {
            PageClass,
            options,
            regex: this._pathToRegex(path),
        });
    }

    /**
     * Start the router
     */
    start() {
        // Listen for route changes
        if (this.mode === 'hash') {
            window.addEventListener('hashchange', () => this._handleRouteChange());
        } else {
            window.addEventListener('popstate', () => this._handleRouteChange());
            
            // Intercept link clicks
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href]');
                if (link && this._isSameDomain(link.href)) {
                    e.preventDefault();
                    this.navigate(link.getAttribute('href'));
                }
            });
        }

        // Handle initial route
        this._handleRouteChange();
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {object} data - Optional data to pass to page
     */
    async navigate(path, data = {}) {
        if (this.mode === 'hash') {
            window.location.hash = path;
        } else {
            window.history.pushState(data, '', path);
            await this._handleRouteChange();
        }
    }

    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }

    /**
     * Get current path
     * @returns {string} Current path
     */
    getCurrentPath() {
        if (this.mode === 'hash') {
            return window.location.hash.slice(1) || '/';
        } else {
            return window.location.pathname;
        }
    }

    /**
     * Handle route change
     * @private
     */
    async _handleRouteChange() {
        const path = this.getCurrentPath();
        const { route, params, query } = this._matchRoute(path);

        // Call before navigate hook
        if (this.beforeNavigateHook) {
            const shouldContinue = await this.beforeNavigateHook(path, params, query);
            if (shouldContinue === false) {
                return;
            }
        }

        // Unmount current page
        if (this.currentPage) {
            await this.currentPage.unmount();
            this.currentPage = null;
        }

        if (!route) {
            if (this.notFoundHandler) {
                await this.notFoundHandler(path);
            } else {
                this._show404(path);
            }
            return;
        }

        try {
            // Create and mount new page
            const { PageClass, options } = route;
            const pageInstance = new PageClass({
                ...options,
                params,
                query,
            });
            
            // Store router reference in page
            pageInstance.router = this;

            await pageInstance.mount(this.container);
            this.currentPage = pageInstance;

            // Call after navigate hook
            if (this.afterNavigateHook) {
                await this.afterNavigateHook(path, params, query, pageInstance);
            }
        } catch (error) {
            console.error('Error navigating to route:', error);
            this._showError(error);
        }
    }

    /**
     * Match route pattern
     * @private
     */
    _matchRoute(path) {
        // Remove query string for matching
        const [pathname, queryString] = path.split('?');
        const query = this._parseQueryString(queryString);

        for (const [pattern, route] of this.routes) {
            const match = pathname.match(route.regex);
            if (match) {
                const params = this._extractParams(pattern, match);
                return { route, params, query };
            }
        }

        return { route: null, params: {}, query };
    }

    /**
     * Convert path to regex
     * @private
     */
    _pathToRegex(path) {
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }

    /**
     * Extract parameters from matched route
     * @private
     */
    _extractParams(pattern, match) {
        const paramNames = pattern.match(/:\w+/g) || [];
        const params = {};

        paramNames.forEach((paramName, index) => {
            const key = paramName.slice(1); // Remove ':'
            params[key] = match[index + 1];
        });

        return params;
    }

    /**
     * Parse query string
     * @private
     */
    _parseQueryString(queryString) {
        if (!queryString) return {};

        return queryString.split('&').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            acc[decodeURIComponent(key)] = decodeURIComponent(value || '');
            return acc;
        }, {});
    }

    /**
     * Check if URL is same domain
     * @private
     */
    _isSameDomain(url) {
        const link = document.createElement('a');
        link.href = url;
        return link.hostname === window.location.hostname;
    }

    /**
     * Show 404 page
     * @private
     */
    _show404(path) {
        const container = document.querySelector(this.container);
        if (container) {
            container.innerHTML = `
                <div class="error-page">
                    <h1>404 - Página não encontrada</h1>
                    <p>A página "${path}" não existe.</p>
                    <a href="/">Voltar para a página inicial</a>
                </div>
            `;
        }
    }

    /**
     * Show error page
     * @private
     */
    _showError(error) {
        const container = document.querySelector(this.container);
        if (container) {
            container.innerHTML = `
                <div class="error-page">
                    <h1>Erro ao carregar página</h1>
                    <p>${error.message}</p>
                    <a href="/">Voltar para a página inicial</a>
                </div>
            `;
        }
    }
}
