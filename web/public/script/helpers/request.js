import { TemplateVar } from './template-var.js';

/**
 * Builds a query string; arrays repeat their key and empty values are left out.
 *
 * @param {Record<string, unknown>} [data] Query fields.
 * @returns {string} The query without `?`, or `''`.
 */
export function toQuery(data = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null || value === '') continue;
        for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
    }
    return params.toString();
}

/**
 * Parses a response body as JSON, falling back to its text (static files, empty bodies).
 *
 * @param {string} text Response body.
 * @returns {unknown} Parsed JSON, or the text itself.
 */
export function parseBody(text) {
    if (text === '') return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}

/**
 * Reads a response body as text, reporting how much of it arrived.
 *
 * @param {Response} response Fetch response.
 * @param {(ratio: number) => void} onProgress Called with 0 to 1 as chunks arrive (only when the size is known).
 * @returns {Promise<string>}
 */
async function readWithProgress(response, onProgress) {
    const total = Number(response.headers.get('content-length'));
    if (!response.body || !total) return response.text();

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onProgress(Math.min(1, received / total));
    }
    return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
}

/**
 * Error thrown when the server answers outside the 2xx range or cannot be reached. API errors
 * carry the stable `code` (e.g. `NOT_SIGNED_IN`) the frontend decides on.
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
        this.code = data && typeof data === 'object' && typeof data.code === 'string' ? data.code : undefined;
        /** The API error's `data` payload (e.g. `{ limit }` for `GLADIATOR_LIMIT`). */
        this.details = data && typeof data === 'object' ? data.data : undefined;
        this.aborted = aborted;
    }
}

/**
 * Fetch transport: JSON bodies, query-string GETs and parsed JSON answers.
 */
export class Request {
    #baseURL;

    /**
     * @param {{ baseURL?: string|(() => string), credentials?: RequestCredentials, timeout?: number }} [config]
     *   `baseURL` may be a function, read on the first request (the API origin is a template var).
     */
    constructor({ baseURL = '', credentials = 'same-origin', timeout = 60000 } = {}) {
        this.#baseURL = baseURL;
        this.credentials = credentials;
        this.timeout = timeout;
    }

    /** @returns {string} The base URL without a trailing slash. */
    get baseURL() {
        const base = typeof this.#baseURL === 'function' ? this.#baseURL() : this.#baseURL;
        return String(base || '').replace(/\/$/, '');
    }

    /**
     * @param {string} path Path from the base, e.g. `gladiators/12`.
     * @param {Record<string, unknown>} [query] Query fields.
     * @param {Parameters<Request['request']>[3]} [options]
     * @returns {Promise<any>}
     */
    get(path, query = {}, options = {}) {
        const search = toQuery(query);
        return this.request('GET', search ? `${path}?${search}` : path, undefined, options);
    }

    /**
     * @param {string} path
     * @param {Record<string, unknown>|FormData} [data] JSON body, or form data for uploads.
     * @param {Parameters<Request['request']>[3]} [options]
     * @returns {Promise<any>}
     */
    post(path, data = {}, options = {}) {
        return this.request('POST', path, data, options);
    }

    /**
     * @param {string} path
     * @param {Record<string, unknown>} [data]
     * @param {Parameters<Request['request']>[3]} [options]
     * @returns {Promise<any>}
     */
    put(path, data = {}, options = {}) {
        return this.request('PUT', path, data, options);
    }

    /**
     * @param {string} path
     * @param {Record<string, unknown>} [query]
     * @param {Parameters<Request['request']>[3]} [options]
     * @returns {Promise<any>}
     */
    delete(path, query = {}, options = {}) {
        const search = toQuery(query);
        return this.request('DELETE', search ? `${path}?${search}` : path, undefined, options);
    }

    /**
     * Sends a request and parses its body.
     *
     * @param {'GET'|'POST'|'PUT'|'DELETE'} method HTTP method.
     * @param {string} path Path from the base URL.
     * @param {Record<string, unknown>|FormData} [data] Body.
     * @param {{ signal?: AbortSignal, timeout?: number, onProgress?: (ratio: number) => void }} [options]
     *   Abort signal, timeout and a download progress callback (0 to 1, when the size is known).
     * @returns {Promise<any>}
     * @throws {RequestError} On a non-2xx answer, a timeout, an abort (status 0, `aborted`) or a network failure.
     */
    async request(method, path, data, { signal, timeout = this.timeout, onProgress } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        signal?.addEventListener('abort', () => controller.abort(), { once: true });
        const base = this.baseURL;
        const url = base ? `${base}/${path.replace(/^\//, '')}` : path;

        const init = { method, credentials: this.credentials, signal: controller.signal };
        if (data instanceof FormData) init.body = data;
        else if (data !== undefined) {
            init.body = JSON.stringify(data);
            init.headers = { 'Content-Type': 'application/json' };
        }

        try {
            const response = await fetch(url, init);
            const body = parseBody(onProgress ? await readWithProgress(response, onProgress) : await response.text());
            if (!response.ok) {
                const message = body && typeof body === 'object' && body.message ? body.message : (response.statusText || 'Request failed');
                throw new RequestError(response.status, message, body);
            }
            return body;
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

/** The gladCode API (its origin comes from the page's template vars), with the session cookie. */
export const api = new Request({ baseURL: () => TemplateVar.get('apiUrl'), credentials: 'include' });

/** Static files of this site (function reference JSON, samples). */
export const site = new Request();
