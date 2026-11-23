import { BaseComponent } from './base-component.js';
import { Avatar } from './avatar.js';
import { MenuItem } from './menu-item.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { painelMenuTemplate } from '../templates/painel-menu.js';

/**
 * The ordered entries of the rail (docs/frontend/events.md, flow 1). `group` is the visible
 * heading; profile is the identity card, not an entry.
 */
export const PAINEL_SECTIONS = Object.freeze([
    { id: 'news', label: 'Notícias', href: '/news', icon: 'news' },
    { id: 'glads', label: 'Gladiadores', href: '/glads', icon: 'glads', group: 'Preparação' },
    { id: 'potions', label: 'Poções', href: '/potion', icon: 'potions', group: 'Preparação' },
    { id: 'battle', label: 'Batalhas', href: '/battle', icon: 'battle', group: 'Arena' },
    { id: 'report', label: 'Relatórios', href: '/reports', icon: 'reports', group: 'Arena' },
    { id: 'ranking', label: 'Ranking', href: '/ranking', icon: 'ranking', group: 'Arena' },
    { id: 'messages', label: 'Mensagens', href: '/messages', icon: 'messages', group: 'Comunidade' },
    { id: 'friends', label: 'Amigos', href: '/friends', icon: 'friends', group: 'Comunidade' },
]);

/**
 * The master level's XP rule (the section owns the same rule until WP4).
 *
 * @param {number|string} level
 * @returns {number}
 */
export function xpToNextLevel(level) {
    return (parseInt(level, 10) * 1.9 + 1) * 130;
}

/**
 * The rail's potion badge: the time until the soonest expiry, in the board's “3 h” shape.
 *
 * @param {{ nextExpiry: string|null, serverNow: string }} potions
 * @returns {string}
 */
export function potionTime(potions) {
    if (!potions?.nextExpiry) return '';
    const end = new Date(String(potions.nextExpiry).replace(' ', 'T')).getTime();
    const start = new Date(String(potions.serverNow).replace(' ', 'T')).getTime();
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    if (minutes >= 60) return `${Math.floor(minutes / 60)} h`;
    return `${minutes} min`;
}

/**
 * The 264 px Painel rail: identity card, grouped links, new gladiator and the shortcut hint.
 */
export class PainelMenu extends BaseComponent {
    #items = new Map();
    #avatar;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {Array<{ id: string, label: string, href: string, icon: string, group?: string }>} [options.sections]
     * @param {Record<string, any>|null} [options.account]
     * @param {object|null} [options.counts]
     */
    constructor({ element, sections = PAINEL_SECTIONS, account = null, counts = null } = {}) {
        super(element ?? createElement("<nav class='painel-menu' aria-label='Painel'></nav>"));
        this.element.innerHTML = renderTemplate(painelMenuTemplate, {
            profileIcon: icon('profile', { size: 18 }),
            plusIcon: icon('plus', { size: 16 }),
        });
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.painel-menu-avatar-slot').append(this.#avatar.element);
        this.#build(sections);
        this.setAccount(account);
        this.setCounts(counts);
    }

    /** @param {Array<{ id: string, label: string, href: string, icon: string, group?: string }>} sections */
    #build(sections) {
        const container = this.element.querySelector('.painel-menu-groups');
        let group = null;
        for (const section of sections) {
            if (section.group && section.group !== group) {
                group = section.group;
                const heading = document.createElement('span');
                heading.className = 'painel-menu-group-label';
                heading.textContent = group;
                container.append(heading);
            }
            const item = new MenuItem({ ...section, section: section.id });
            this.#items.set(section.id, item);
            container.append(item.element);
        }
    }

    /**
     * @param {string} section
     * @returns {this}
     */
    setActive(section) {
        for (const [id, item] of this.#items) item.setActive(id === section);
        this.element.querySelector('#profile-ui')?.classList.toggle('is-active', section === 'profile');
        if (section === 'profile') this.element.querySelector('#profile-ui')?.setAttribute('aria-current', 'page');
        else this.element.querySelector('#profile-ui')?.removeAttribute('aria-current');
        return this;
    }

    /**
     * @param {Record<string, any>|null} user
     * @returns {this}
     */
    setAccount(user) {
        if (!user) return this;
        this.#avatar.set({ name: user.nickname, picture: user.picture, level: user.level });
        this.element.querySelector('#nickname').textContent = user.nickname ?? '';
        this.element.querySelector('.painel-menu-level-value').textContent = String(user.level ?? 0);
        const total = Math.round(xpToNextLevel(user.level));
        const xp = Number(user.xp) || 0;
        this.element.querySelector('#xp #filled').style.width = `${Math.min(100, Math.round((xp / total) * 100))}%`;
        this.element.querySelector('.painel-menu-xp-current').textContent = `${xp} / ${total} XP`;
        this.element.querySelector('.painel-menu-xp-next').textContent = `nível ${Number(user.level || 0) + 1}`;
        return this;
    }

    /**
     * @param {import('../helpers/event-bus.js').NotificationCounts|null} counts
     * @returns {this}
     */
    setCounts(counts) {
        if (!counts) return this;
        const news = Number(counts.news || 0);
        this.#items.get('news')?.setBadge(news ? `${news} nova${news === 1 ? '' : 's'}` : '', 'unread');
        const glads = counts.gladiators ?? {};
        this.#items.get('glads')?.setBadge(
            glads.limit ? `${glads.used ?? 0}/${glads.limit}` : String(glads.remaining ?? ''),
            'info',
        );
        this.#items.get('potions')?.setBadge(potionTime(counts.potions), 'info');
        const duels = Number(counts.duels || 0);
        this.#items.get('battle')?.setBadge(duels ? String(duels) : '', 'action', `${duels} desafio${duels === 1 ? '' : 's'} de duelo`);
        const reports = Number(counts.reports?.ranked || 0) + Number(counts.reports?.duel || 0);
        this.#items.get('report')?.setBadge(reports ? String(reports) : '', 'unread');
        this.#items.get('messages')?.setBadge(counts.messages ? String(counts.messages) : '', 'unread');
        const friends = Number(counts.friends || 0);
        this.#items.get('friends')?.setBadge(friends ? String(friends) : '', 'action', `${friends} convite${friends === 1 ? '' : 's'} de amizade`);
        return this;
    }

    /**
     * @param {number|null} position
     * @returns {this}
     */
    setRanking(position) {
        this.#items.get('ranking')?.setBadge(position ? `#${position}` : '', 'info');
        return this;
    }

    /** @param {string} section @param {boolean} on @returns {this} */
    setDisabled(section, on) {
        this.#items.get(section)?.setDisabled(on);
        return this;
    }
}
