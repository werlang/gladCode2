/**
 * Main Application Entry Point
 * Initializes the application, sets up services, and starts the router
 */

import config from '../config.js';
import EventBus from './core/EventBus.js';
import Store from './core/Store.js';
import Router from './core/Router.js';
import APIService from './services/APIService.js';
import AuthService from './services/AuthService.js';
import WebSocketService from './services/WebSocketService.js';

// Import pages (will be created later)
// import HomePage from './pages/HomePage.js';
// import EditorPage from './pages/EditorPage.js';
// import ProfilePage from './pages/ProfilePage.js';

class App {
    constructor() {
        this.eventBus = new EventBus();
        this.store = new Store({
            user: null,
            gladiators: [],
            notifications: [],
            loading: false,
        });
        
        this.api = new APIService(config.api.baseURL);
        this.auth = new AuthService(this.api, this.eventBus);
        this.ws = new WebSocketService(config.websocket.url, this.eventBus);
        
        this.router = new Router({
            mode: 'hash',
            container: '#app',
            beforeNavigate: (path) => this.beforeNavigate(path),
            afterNavigate: (path) => this.afterNavigate(path),
        });

        // Make services globally available for debugging
        if (config.features.enableDebugMode) {
            window.app = this;
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing gladCode application...');
            
            // Initialize authentication
            await this.auth.init();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up routes
            this.setupRoutes();
            
            // Connect to WebSocket (non-blocking)
            this.connectWebSocket().catch(error => {
                console.warn('WebSocket connection failed:', error);
            });
            
            // Start router
            this.router.start();
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Falha ao inicializar aplicação. Por favor, recarregue a página.');
        }
    }

    /**
     * Set up application routes
     */
    setupRoutes() {
        // For now, create a simple placeholder page
        // These will be replaced with actual page classes later
        
        class PlaceholderPage {
            constructor(options = {}) {
                this.title = options.title || 'gladCode';
                this.content = options.content || '<h1>Em desenvolvimento</h1>';
            }
            
            async beforeMount() {}
            async afterMount() {}
            async beforeUnmount() {}
            
            async mount(container) {
                const containerEl = typeof container === 'string' 
                    ? document.querySelector(container)
                    : container;
                
                if (containerEl) {
                    containerEl.innerHTML = `
                        <div class="placeholder-page">
                            ${this.content}
                            <p>Esta página está em desenvolvimento.</p>
                            <a href="#/">Voltar para início</a>
                        </div>
                    `;
                }
                
                document.title = this.title;
            }
            
            async unmount() {}
        }
        
        // Add routes
        this.router.addRoute('/', PlaceholderPage, {
            title: 'gladCode - Início',
            content: '<h1>Bem-vindo ao gladCode</h1>',
        });
        
        this.router.addRoute('/editor', PlaceholderPage, {
            title: 'gladCode - Editor',
            content: '<h1>Editor de Código</h1>',
        });
        
        this.router.addRoute('/profile', PlaceholderPage, {
            title: 'gladCode - Perfil',
            content: '<h1>Perfil do Usuário</h1>',
        });
        
        this.router.addRoute('/tournament', PlaceholderPage, {
            title: 'gladCode - Torneios',
            content: '<h1>Torneios</h1>',
        });
        
        this.router.addRoute('/training', PlaceholderPage, {
            title: 'gladCode - Treinamento',
            content: '<h1>Treinamento</h1>',
        });
        
        this.router.addRoute('/docs', PlaceholderPage, {
            title: 'gladCode - Documentação',
            content: '<h1>Documentação</h1>',
        });
        
        this.router.addRoute('/about', PlaceholderPage, {
            title: 'gladCode - Sobre',
            content: '<h1>Sobre o gladCode</h1>',
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Authentication events
        this.eventBus.on('auth:login', (user) => {
            this.store.setState('user', user);
            console.log('User logged in:', user);
        });

        this.eventBus.on('auth:logout', () => {
            this.store.setState('user', null);
            this.router.navigate('/');
            console.log('User logged out');
        });

        this.eventBus.on('auth:error', (error) => {
            this.showError('Erro de autenticação: ' + error.message);
        });

        // WebSocket events
        this.eventBus.on('websocket:connect', () => {
            console.log('Real-time connection established');
            
            // Join user room if authenticated
            const user = this.store.getState('user');
            if (user) {
                this.ws.joinRoom(`user-${user.id}`);
            }
        });

        this.eventBus.on('websocket:disconnect', () => {
            console.log('Real-time connection lost');
        });

        // Handle specific WebSocket messages
        this.eventBus.on('websocket:profile notification', (data) => {
            console.log('Profile notification:', data);
            // Handle profile notifications
        });

        this.eventBus.on('websocket:chat message', (data) => {
            console.log('Chat message:', data);
            // Handle chat messages
        });
    }

    /**
     * Connect to WebSocket
     */
    async connectWebSocket() {
        try {
            await this.ws.connect();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            // Don't throw - WebSocket is optional
        }
    }

    /**
     * Before navigate hook
     */
    async beforeNavigate(path) {
        // Show loading if needed
        this.store.setState('loading', true);
        
        // Check authentication for protected routes
        const protectedRoutes = ['/profile', '/editor'];
        if (protectedRoutes.some(route => path.startsWith(route))) {
            if (!this.auth.isAuthenticated()) {
                this.showError('Você precisa fazer login para acessar esta página.');
                this.router.navigate('/');
                return false;
            }
        }
        
        return true;
    }

    /**
     * After navigate hook
     */
    afterNavigate(path) {
        this.store.setState('loading', false);
        
        // Track page view
        if (window.gtag) {
            gtag('config', 'G-VT4EF5GTBP', {
                page_path: path
            });
        }
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // TODO: Implement proper error UI (toast/notification)
        alert(message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        // TODO: Implement proper success UI (toast/notification)
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}
