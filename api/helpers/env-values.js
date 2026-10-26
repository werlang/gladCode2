/**
 * Reads a bounded integer from the environment. Empty or non-numeric values fall back to the
 * default; finite values are truncated and clamped into [min, max].
 *
 * @param {string} name Environment variable name.
 * @param {{ fallback: number, min?: number, max?: number }} options
 * @returns {number}
 */
export function readIntEnv(name, { fallback, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
    const raw = process.env[name];
    if (typeof raw !== 'string' || raw.trim() === '') return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.trunc(parsed), min), max);
}

/**
 * Builds an origin from a base host URL (`http://localhost`) and an external port. A base that
 * already carries a port is kept; ports 80 and 443 add nothing.
 *
 * @param {unknown} base Base URL without port.
 * @param {unknown} port External port.
 * @returns {string} The origin, or `''` when the base is empty.
 */
export function buildUrl(base, port) {
    const cleanBase = String(base ?? '').trim().replace(/\/+$/, '');
    if (!cleanBase) return '';

    let url;
    try {
        url = new URL(cleanBase);
    }
    catch {
        return cleanBase;
    }
    if (url.port) return url.origin;

    const portText = String(port ?? '').trim();
    if (!/^\d+$/.test(portText) || portText === '80' || portText === '443') return url.origin;
    return `${url.origin}:${portText}`;
}

/** @returns {string} The configured browser origin of the web service. */
export function webOrigin() {
    return buildUrl(process.env.WEB_URL, process.env.WEB_PORT);
}
