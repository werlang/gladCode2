/**
 * AuthService - Authentication and user management
 * Handles Google OAuth integration and session management
 * 
 * @example
 * const auth = new AuthService(apiService, eventBus);
 * await auth.init();
 * await auth.login(credential);
 */

import { localStorage } from '../utils/storage.js';

export default class AuthService {
    constructor(apiService, eventBus) {
        this.api = apiService;
        this.eventBus = eventBus;
        this.user = null;
        this.googleClient = null;
        this.googleLoaded = false;
        this.clientId = '108043684563-ufdkp1teq749udehcfjjtuk277q5h0me.apps.googleusercontent.com';
    }

    /**
     * Initialize authentication service
     */
    async init() {
        // Load Google OAuth script
        await this._loadGoogleScript();
        
        // Check for stored credential
        const credential = localStorage.get('google-credential');
        if (credential) {
            try {
                await this.login(credential);
            } catch (error) {
                console.warn('Failed to restore session:', error);
                localStorage.remove('google-credential');
            }
        }
    }

    /**
     * Load Google OAuth script
     * @private
     */
    async _loadGoogleScript() {
        if (this.googleLoaded) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            script.onload = async () => {
                // Wait for google object to be available
                while (typeof google === 'undefined') {
                    await new Promise(r => setTimeout(r, 100));
                }
                
                // Initialize Google OAuth
                google.accounts.id.initialize({
                    client_id: this.clientId,
                    callback: (response) => this._handleGoogleResponse(response),
                    auto_select: true,
                    ux_mode: 'popup',
                });
                
                this.googleLoaded = true;
                resolve();
            };
            
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Handle Google OAuth response
     * @private
     */
    async _handleGoogleResponse(response) {
        try {
            await this.login(response.credential);
        } catch (error) {
            console.error('Google login failed:', error);
            this.eventBus.emit('auth:error', error);
        }
    }

    /**
     * Login with Google credential
     * @param {string} credential - Google credential token
     */
    async login(credential) {
        try {
            const response = await this.api.post('back_login.php', { credential });
            
            if (response.status === 'success' || response.user) {
                this.user = response.user;
                localStorage.set('google-credential', credential);
                this.eventBus.emit('auth:login', this.user);
                return this.user;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            // Call logout endpoint
            await this.api.post('back_logout.php');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state regardless of API call success
            this.user = null;
            localStorage.remove('google-credential');
            this.eventBus.emit('auth:logout');
            
            // Sign out from Google
            if (this.googleLoaded && google?.accounts?.id) {
                google.accounts.id.disableAutoSelect();
            }
        }
    }

    /**
     * Show Google login prompt
     */
    async prompt() {
        if (!this.googleLoaded) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            let resolved = false;

            // Set up one-time login listener
            const unsubscribe = this.eventBus.once('auth:login', (user) => {
                resolved = true;
                resolve(user);
            });

            // Show prompt
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() && !resolved) {
                    unsubscribe();
                    reject(new Error('Google prompt not displayed'));
                }
            });
        });
    }

    /**
     * Render Google login button
     * @param {HTMLElement} container - Container element
     * @param {object} options - Button options
     */
    renderButton(container, options = {}) {
        if (!this.googleLoaded) {
            console.error('Google OAuth not loaded');
            return;
        }

        google.accounts.id.renderButton(container, {
            theme: options.theme || 'outline',
            size: options.size || 'large',
            locale: options.locale || 'pt-BR',
            width: options.width || '200',
            ...options,
        });
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.user !== null;
    }

    /**
     * Get current user
     * @returns {object|null}
     */
    getUser() {
        return this.user;
    }

    /**
     * Update user data
     * @param {object} userData - Updated user data
     */
    updateUser(userData) {
        this.user = { ...this.user, ...userData };
        this.eventBus.emit('auth:update', this.user);
    }

    /**
     * Check if user has specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    hasPermission(permission) {
        if (!this.user) return false;
        // Implement permission checking logic based on your requirements
        return true;
    }
}
