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

/**
 * Maps an old PHP page URL to its current address, so shared and bookmarked links keep working.
 *
 * @param {string} page File name without `.php` (e.g. `playback`).
 * @param {Record<string, unknown>} query The request query.
 * @returns {string|null} The new path, or null when the page no longer exists.
 */
export function legacyPageUrl(page, query) {
    const value = key => (typeof query[key] === 'string' ? encodeURIComponent(query[key]) : '');
    switch (page) {
        case 'index': return value('login') ? `/?login=${value('login')}` : '/';
        case 'playback': return value('log') ? `/play/${value('log')}` : '/';
        case 'tournament': return value('h') ? `/tourn/${value('h')}${value('r') ? `/${value('r')}` : ''}` : '/';
        case 'training': return value('h') ? `/train/${value('h')}${value('r') ? `/${value('r')}` : ''}` : '/';
        case 'editor': return value('g') === '0' ? '/newglad' : (value('g') ? `/glad-${value('g')}` : '/editor');
        case 'post': return value('p') ? `/post/${value('p')}` : '/';
        case 'function': return value('f') ? `/${value('l') === 'pt' ? 'funcao' : 'function'}/${value('f')}${value('p') ? `.${value('p')}` : ''}` : '/manual';
        case 'profile': return `/profile${value('t') ? `?t=${value('t')}${value('s') ? `&s=${value('s')}` : ''}` : ''}`;
        case 'about': case 'creditos': case 'docs': case 'docs-ptbr': case 'docs-blocks':
        case 'manual': case 'stats': case 'thanks': case 'update':
            return `/${page}`;
        default: return null;
    }
}
