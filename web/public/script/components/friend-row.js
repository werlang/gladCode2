import { Avatar } from './avatar.js';
import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { friendRowTemplate } from '../templates/friends.js';

/** One row of the Amigos list (docs/frontend/components.md). */
export class FriendRow extends BaseComponent {
    #friend = null;
    #avatar;

    /** @param {{ element?: HTMLElement, friend?: object }} [options] */
    constructor({ element, friend = null } = {}) {
        super(element ?? createElement(renderTemplate(friendRowTemplate, {
            name: friend?.nick ?? '',
            level: 0, best: '', renown: '',
            message: icon('messages', { size: 16, className: 'icon' }),
            swords: icon('battle', { size: 14, className: 'icon' }),
            more: icon('dots', { size: 16, className: 'icon' }),
        })));
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.friend-avatar').append(this.#avatar.element);
        this.element.querySelector('.friend-message').addEventListener('click', () => {
            if (this.#friend) this.emit('message', { friend: this.#friend });
        });
        this.element.querySelector('.friend-challenge').addEventListener('click', () => {
            if (this.#friend) this.emit('challenge', { friend: this.#friend });
        });
        this.element.querySelector('.friend-more').addEventListener('click', event => {
            if (this.#friend) this.emit('more', { friend: this.#friend, anchor: event.currentTarget });
        });
        if (friend) this.setFriend(friend);
    }

    /** @returns {object|null} */
    get friend() {
        return this.#friend;
    }

    /** @param {object} friend @returns {this} */
    setFriend(friend) {
        this.#friend = friend;
        this.element.querySelector('.friend-name').textContent = friend.nick ?? '';
        this.element.querySelector('.friend-meta-text').textContent = `Nível ${friend.level ?? 0} · melhor: ${friend.bestGladiator ?? '—'}`;
        this.element.querySelector('.friend-mmr').textContent = friend.bestRenown != null
            ? Number(friend.bestRenown).toLocaleString('pt-BR')
            : '';
        this.#avatar.set({
            name: friend.nick,
            picture: friend.picture,
            level: friend.level,
        });
        this.setOnline(Boolean(friend.online));
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setOnline(on) {
        this.#avatar.setOnline(Boolean(on));
        return this;
    }
}
