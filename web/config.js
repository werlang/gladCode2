/**
 * Client-side configuration
 * Runtime configuration for the application
 */

export const config = {
    // API configuration
    api: {
        baseURL: window.location.origin,
        timeout: 30000,
        retries: 3,
    },
    
    // WebSocket configuration
    websocket: {
        url: window.location.origin,
        reconnectInterval: 3000,
        reconnectAttempts: 5,
    },
    
    // Google OAuth configuration
    google: {
        clientId: '108043684563-ufdkp1teq749udehcfjjtuk277q5h0me.apps.googleusercontent.com',
    },
    
    // Application settings
    app: {
        defaultLocale: 'pt-BR',
        supportedLocales: ['pt-BR', 'en'],
    },
    
    // Feature flags
    features: {
        enableDebugMode: window.location.hostname === 'localhost',
        enableServiceWorker: false,
    },
    
    // Routes configuration
    routes: {
        home: '/',
        editor: '/editor',
        profile: '/profile',
        tournament: '/tournament',
        training: '/training',
        playback: '/playback',
        docs: '/docs',
        about: '/about',
        manual: '/manual',
    },
};

export default config;
