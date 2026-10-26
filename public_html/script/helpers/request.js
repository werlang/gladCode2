/**
 * Serialises a value the way PHP reads `$_POST`: nested objects become
 * `key[sub]=value` and arrays `key[]=value` (the format jQuery's `$.param`
 * produced, which every `back_*.php` endpoint was written against).
 *
 * @param {Record<string, unknown>} data Request fields.
 * @returns {URLSearchParams} Form-encoded body.
 */
export function toFormBody(data = {}) {
    const params = new URLSearchParams();

    const append = (key, value) => {
        if (value === undefined) return;
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const isNested = item !== null && typeof item === 'object';
                append(`${key}[${isNested ? index : ''}]`, item);
            });
        }
        else if (value !== null && typeof value === 'object') {
            Object.entries(value).forEach(([sub, item]) => append(`${key}[${sub}]`, item));
        }
        else {
            params.append(key, value === null ? '' : String(value));
        }
    };

    Object.entries(data).forEach(([key, value]) => append(key, value));
    return params;
}

/**
 * Parses a response body as JSON, falling back to its text.
 *
 * The PHP endpoints echo JSON without a content type, and a few echo plain
 * text, so the body decides rather than the header.
 *
 * @param {string} text Response body.
 * @returns {unknown} Parsed JSON, or the text itself.
 */
export function parseBody(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}

/**
 * Error thrown when the server answers outside the 2xx range or cannot be reached.
 */
export class RequestError extends Error {
    /**
     * @param {number} status HTTP status, 0 when the network failed.
     * @param {string} message Description.
     * @param {unknown} [data] Parsed response body.
     * @param {{ aborted?: boolean }} [options] `aborted` when the caller cancelled the request.
     */
    constructor(status, message, data, { aborted = false } = {}) {
        super(message);
        this.name = 'RequestError';
        this.status = status;
        this.data = data;
        this.aborted = aborted;
    }
}

/**
 * Fetch transport for the PHP backend: form-encoded POSTs, query-string GETs,
 * session cookies included and bodies parsed as JSON when they are JSON.
 */
export class Request {
    /**
     * @param {{ baseURL?: string, timeout?: number }} [config]
     */
    constructor({ baseURL = '', timeout = 60000 } = {}) {
        this.baseURL = baseURL.replace(/\/$/, '');
        this.timeout = timeout;
    }

    /**
     * @param {string} endpoint Path relative to the site root, e.g. `back_glad.php`.
     * @param {Record<string, unknown>} [data] Query fields.
     * @returns {Promise<unknown>}
     */
    get(endpoint, data = {}) {
        const query = toFormBody(data).toString();
        return this.request('GET', query ? `${endpoint}?${query}` : endpoint);
    }

    /**
     * @param {string} endpoint Path relative to the site root.
     * @param {Record<string, unknown>|FormData} [data] Body fields.
     * @param {{ signal?: AbortSignal, timeout?: number }} [options] Abort signal and timeout.
     * @returns {Promise<unknown>}
     */
    post(endpoint, data = {}, options = {}) {
        const body = data instanceof FormData ? data : toFormBody(data);
        return this.request('POST', endpoint, body, options);
    }

    /**
     * Sends a request and parses its body.
     *
     * @param {'GET'|'POST'} method HTTP method.
     * @param {string} endpoint Path relative to the site root.
     * @param {BodyInit} [body] Request body.
     * @param {{ signal?: AbortSignal, timeout?: number }} [options] Abort signal and timeout.
     * @returns {Promise<unknown>}
     * @throws {RequestError} On a non-2xx answer, a timeout, an abort (status 0, `aborted`) or a network failure.
     */
    async request(method, endpoint, body, { signal, timeout = this.timeout } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        signal?.addEventListener('abort', () => controller.abort(), { once: true });
        const url = this.baseURL ? `${this.baseURL}/${endpoint}` : endpoint;

        try {
            const response = await fetch(url, {
                method,
                body,
                credentials: 'same-origin',
                signal: controller.signal,
            });
            const data = parseBody(await response.text());
            if (!response.ok) {
                throw new RequestError(response.status, response.statusText || 'Request failed', data);
            }
            return data;
        }
        catch (error) {
            if (error instanceof RequestError) throw error;
            if (error.name === 'AbortError') {
                if (signal?.aborted) throw new RequestError(0, 'Request aborted', undefined, { aborted: true });
                throw new RequestError(408, 'Request timeout');
            }
            throw new RequestError(0, error.message || 'Network failure');
        }
        finally {
            clearTimeout(timer);
        }
    }
}

/** Shared transport for every frontend model. */
export const api = new Request();
