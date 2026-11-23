/** The Painel section ids (docs/frontend/events.md). */
export const SECTION_IDS = Object.freeze(['news', 'profile', 'glads', 'potions', 'battle', 'report', 'ranking', 'messages', 'friends']);

/** Names used by the shell title and the menu. */
export const SECTION_TITLES = Object.freeze({
    news: 'Notícias', profile: 'Perfil', glads: 'Gladiadores', potions: 'Poções', battle: 'Batalhas',
    report: 'Relatórios', ranking: 'Ranking', messages: 'Mensagens', friends: 'Amigos',
});

const PATH_SECTIONS = {
    '/news': 'news',
    '/profile': 'profile',
    '/glads': 'glads',
    '/potion': 'potions',
    '/battle': 'battle',
    '/reports': 'report',
    '/ranking': 'ranking',
    '/messages': 'messages',
    '/friends': 'friends',
};

const TAB_SECTIONS = {
    news: 'news', profile: 'profile', glads: 'glads', potions: 'potions', potion: 'potions',
    battle: 'battle', report: 'report', reports: 'report', ranking: 'ranking', messages: 'messages', friends: 'friends',
};

export const BATTLE_MODES = Object.freeze(['ranked', 'duel', 'tourn', 'train']);

/** The G + initial shortcuts the shell and the palette share. */
export const SECTION_SHORTCUTS = Object.freeze({
    news: 'n', potions: 'p', battle: 'b', report: 'r', ranking: 'k', messages: 'm', friends: 'a',
});

/**
 * @typedef {object} PainelRoute
 * @property {'news'|'profile'|'glads'|'potions'|'battle'|'report'|'ranking'|'messages'|'friends'} section
 * @property {string} subtab `''` or a battle mode.
 * @property {{ at?: number, q?: string, tab?: string, userId?: number }} query
 */

/**
 * Resolves a URL into the one shell state. The server routes and the resolver share the same names.
 *
 * @param {string|URL} input
 * @returns {PainelRoute|null} Null when the URL is not a Painel route.
 */
export function resolveRoute(input) {
    const url = input instanceof URL ? input : new URL(String(input), 'http://painel.local');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    let section = PATH_SECTIONS[pathname] ?? null;
    let subtab = '';
    const messagePath = pathname.match(/^\/messages\/(\d+)$/);
    if (messagePath) section = 'messages';
    if (pathname === '/profile') {
        section = TAB_SECTIONS[url.searchParams.get('t') ?? 'profile'] ?? 'profile';
    }
    if (!section) {
        const battle = pathname.match(/^\/battle\.([\w-]+)$/);
        if (!battle) return null;
        section = 'battle';
        subtab = BATTLE_MODES.includes(battle[1]) ? battle[1] : '';
    }
    if (pathname === '/battle' && section === 'battle') subtab = '';
    if (pathname === '/profile' && section === 'battle') subtab = url.searchParams.get('s') ?? '';
    if (!BATTLE_MODES.includes(subtab)) subtab = '';
    const query = {};
    const at = Number(url.searchParams.get('at'));
    if (Number.isInteger(at) && at > 0) query.at = at;
    const q = url.searchParams.get('q');
    if (q) query.q = q;
    const message = pathname.match(/^\/messages\/(\d+)$/);
    if (message) query.userId = Number(message[1]);
    if (section === 'report') {
        const tab = url.searchParams.get('tab');
        if (['battles', 'duels', 'favorites'].includes(tab)) query.tab = tab;
    }
    return { section, subtab, query };
}

/**
 * The canonical URL of a shell state.
 *
 * @param {PainelRoute} state
 * @returns {string}
 */
export function sectionUrl(state) {
    const section = state.section;
    let path = section === 'report' ? '/reports' : section === 'potions' ? '/potion' : `/${section}`;
    if (section === 'battle' && state.subtab) path = `/battle.${state.subtab}`;
    if (section === 'messages' && state.query?.userId) path = `/messages/${state.query.userId}`;
    if (section === 'report' && state.query?.tab) return `/reports?tab=${encodeURIComponent(state.query.tab)}`;
    const params = new URLSearchParams();
    if (section === 'ranking' && state.query?.at) params.set('at', String(state.query.at));
    if (section === 'ranking' && state.query?.q) params.set('q', state.query.q);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
}

/**
 * @param {string} section
 * @returns {string}
 */
export function sectionTitle(section) {
    return SECTION_TITLES[section] ?? 'Painel';
}
