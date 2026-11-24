import { Avatar } from './avatar.js';
import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { inviteBannerTemplate } from '../templates/gladiator-card.js';

/** A highlighted pending invite: a friend request or a duel challenge. */
export class InviteBanner extends BaseComponent {
    #avatar;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(inviteBannerTemplate));
        this.#avatar = new Avatar({ size: 'sm' });
        this.element.querySelector('.invite-avatar').append(this.#avatar.element);
        this.on(this.element.querySelector('.invite-refuse'), 'click', () => {
            if (!this.element.classList.contains('is-busy')) this.emit('refuse', {});
        });
        this.on(this.element.querySelector('.invite-accept'), 'click', () => {
            if (!this.element.classList.contains('is-busy')) this.emit('accept', {});
        });
    }

    /**
     * @param {{ picture?: string, name: string, message: string, detail?: string,
     *   acceptLabel?: string, refuseLabel?: string, label?: string }} invite
     * @returns {this}
     */
    set({ picture = '', name, message, detail = '', acceptLabel = 'Aceitar', refuseLabel = 'Recusar', label = 'Convite pendente' }) {
        this.element.hidden = false;
        this.element.setAttribute('aria-label', label);
        this.#avatar.set({ name, picture, level: 0 });
        this.element.querySelector('.invite-message').textContent = message;
        const detailNode = this.element.querySelector('.invite-detail');
        detailNode.textContent = detail;
        detailNode.hidden = !detail;
        this.element.querySelector('.invite-accept').textContent = acceptLabel;
        this.element.querySelector('.invite-refuse').textContent = refuseLabel;
        return this;
    }

    /** Hides the banner (no pending invite). @returns {this} */
    clear() {
        this.element.hidden = true;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.element.classList.toggle('is-busy', Boolean(on));
        this.element.querySelectorAll('button').forEach(button => { button.disabled = Boolean(on); });
        return this;
    }
}
