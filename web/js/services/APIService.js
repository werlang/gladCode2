/**
 * APIService - HTTP client for API requests
 * Handles all communication with PHP backend
 * 
 * @example
 * const api = new APIService('/');
 * const data = await api.post('back_login.php', { credential });
 */

export default class APIService {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        this.timeout = 30000;
        this.retries = 3;
    }

    /**
     * Make HTTP request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Request options
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            method: options.method || 'GET',
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options,
        };

        // Add body for POST/PUT requests
        if (config.method !== 'GET' && options.body) {
            if (config.headers['Content-Type'] === 'application/json') {
                config.body = JSON.stringify(options.body);
            } else if (options.body instanceof FormData) {
                delete config.headers['Content-Type']; // Let browser set it
                config.body = options.body;
            }
        }

        // Add query parameters for GET requests
        if (config.method === 'GET' && options.params) {
            const queryString = new URLSearchParams(options.params).toString();
            const separator = url.includes('?') ? '&' : '?';
            return this._fetchWithRetry(`${url}${separator}${queryString}`, config);
        }

        return this._fetchWithRetry(url, config);
    }

    /**
     * Fetch with retry logic
     * @private
     */
    async _fetchWithRetry(url, config, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Try to parse as JSON, fallback to text
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                // Check for API error status
                if (data.status === 'SQLERROR' || data.status === 'AUTH_REQUIRED') {
                    throw new Error(data.message || 'API error');
                }
                
                return data;
            }

            return await response.text();
        } catch (error) {
            // Retry on network errors
            if (attempt < this.retries && error.name !== 'AbortError') {
                console.warn(`Request failed, retrying (${attempt}/${this.retries})...`);
                await this._delay(1000 * attempt);
                return this._fetchWithRetry(url, config, attempt + 1);
            }

            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Delay helper for retries
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {object} options - Additional options
     * @returns {Promise<any>}
     */
    async get(endpoint, params = {}, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            params,
            ...options,
        });
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {object} body - Request body
     * @param {object} options - Additional options
     * @returns {Promise<any>}
     */
    async post(endpoint, body = {}, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body,
            ...options,
        });
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} body - Request body
     * @param {object} options - Additional options
     * @returns {Promise<any>}
     */
    async put(endpoint, body = {}, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body,
            ...options,
        });
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Additional options
     * @returns {Promise<any>}
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options,
        });
    }

    /**
     * Upload file
     * @param {string} endpoint - API endpoint
     * @param {File} file - File to upload
     * @param {object} additionalData - Additional form data
     * @returns {Promise<any>}
     */
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return this.post(endpoint, formData, {
            headers: {}, // Remove Content-Type header
        });
    }
}
