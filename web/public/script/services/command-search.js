import { SearchModel } from '../models/search.js';
import { FunctionDocsModel } from '../models/function-docs.js';
import { SECTION_SHORTCUTS } from '../helpers/painel-route.js';

/** The static “Ir para” destinations; `section` is null outside the Painel shell. */
export const PAINEL_COMMANDS = Object.freeze([
    { id: 'news', label: 'Notícias', href: '/news', section: 'news', group: 'Ir para', key: 'G N', keywords: 'painel inicio main' },
    { id: 'profile', label: 'Perfil e ajustes', href: '/profile', section: 'profile', group: 'Ir para', keywords: 'conta settings' },
    { id: 'glads', label: 'Gladiadores', href: '/glads', section: 'glads', group: 'Ir para', keywords: 'personagens arena' },
    { id: 'potions', label: 'Poções', href: '/potion', section: 'potions', group: 'Ir para', key: 'G P', keywords: 'apotecário itens' },
    { id: 'battle', label: 'Batalhas', href: '/battle', section: 'battle', group: 'Ir para', key: 'G B', keywords: 'ranqueada duelo torneio treino' },
    { id: 'report', label: 'Relatórios', href: '/reports', section: 'report', group: 'Ir para', key: 'G R', keywords: 'histórico replays' },
    { id: 'ranking', label: 'Ranking', href: '/ranking', section: 'ranking', group: 'Ir para', key: 'G K', keywords: 'posição classificação' },
    { id: 'messages', label: 'Mensagens', href: '/messages', section: 'messages', group: 'Ir para', key: 'G M', keywords: 'conversas inbox' },
    { id: 'friends', label: 'Amigos', href: '/friends', section: 'friends', group: 'Ir para', key: 'G A', keywords: 'mestres convites' },
    { id: 'editor', label: 'Editor', href: '/editor', section: null, group: 'Ir para', keywords: 'código programar' },
    { id: 'learn', label: 'Aprender', href: '/manual', section: null, group: 'Ir para', keywords: 'manual documentação' },
    { id: 'about', label: 'O Projeto', href: '/about', section: null, group: 'Ir para', keywords: 'sobre história' },
    { id: 'credits', label: 'Créditos', href: '/creditos', section: null, group: 'Ir para', keywords: 'artistas bibliotecas' },
    { id: 'stats', label: 'Estatísticas', href: '/stats', section: null, group: 'Ir para', keywords: 'números batalhas' },
]);

/**
 * The palette's query: the static destinations, matching gladiators/masters and function docs.
 * Every remote group is best-effort; a failed search never empties the section links.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ groups: Array<{ title: string, items: Array<object> }> }>}
 */
export async function searchShell(query, { signal } = {}) {
    const text = String(query ?? '').trim();
    const needle = text.toLowerCase();
    const local = PAINEL_COMMANDS
        .filter(command => !needle || `${command.label} ${command.keywords ?? ''}`.toLowerCase().includes(needle))
        .map(command => ({
            ...command,
            sub: '',
            key: SECTION_SHORTCUTS[command.section] ? `G ${SECTION_SHORTCUTS[command.section].toUpperCase()}` : command.key ?? '',
        }));
    const groups = [{ title: 'Ir para', items: local }];

    if (needle.length >= 2) {
        const [remote, docs] = await Promise.allSettled([
            SearchModel.query(text, { signal }),
            FunctionDocsModel.all(),
        ]);
        if (remote.status === 'fulfilled') {
            const items = [
                ...(remote.value.gladiators ?? []).map(gladiator => ({
                    id: `glad-${gladiator.id}`,
                    label: gladiator.name,
                    sub: `de ${gladiator.master} · ${Math.round(gladiator.mmr).toLocaleString('pt-BR')} renome`,
                    href: `/ranking?q=${encodeURIComponent(gladiator.name)}`,
                    section: 'ranking',
                    key: '',
                })),
                ...(remote.value.masters ?? []).map(master => ({
                    id: `master-${master.id}`,
                    label: master.nick,
                    sub: `mestre nível ${master.level}`,
                    href: `/ranking?q=${encodeURIComponent(master.nick)}`,
                    section: 'ranking',
                    key: '',
                })),
            ];
            groups.push({ title: 'Gladiadores e mestres', items });
        }
        if (docs.status === 'fulfilled') {
            const items = Object.entries(docs.value)
                .filter(([key, doc]) => {
                    const names = Object.values(doc.name ?? {}).join(' ');
                    return `${key} ${names} ${doc.description?.brief ?? ''}`.toLowerCase().includes(needle);
                })
                .slice(0, 5)
                .map(([key, doc]) => ({
                    id: `doc-${key}`,
                    label: doc.name?.default ?? key,
                    sub: doc.description?.brief ?? 'Manual',
                    href: `/function/${key}`,
                    section: null,
                    key: '',
                }));
            groups.push({ title: 'Documentação', items });
        }
    }
    return { groups: groups.filter(group => group.items.length) };
}
