import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn, hide, isVisible } from '../helpers/animate.js';
import { FriendModel } from '../models/social.js';
import { ChallengeList, challengeFriend } from './duels.js';
import { RankedBattle } from './ranked.js';
import { TournamentsTab } from './tournaments.js';
import { TrainingsTab } from './trainings.js';
import { friendFilterRowTemplate } from '../templates/profile.js';

/**
 * The BATALHAS tab: ranked battles, duels, tournaments and trainings, each
 * opened by its mode button.
 */
export class BattleTab {
    #panel = document.querySelector('#panel #battle-container');
    #friend = null;
    /** The current navigation signal; the sub-tabs and filters keep using it. */
    #signal = null;
    /** Answers to older friend filters are dropped. */
    #filterRequest = 0;

    /**
     * @param {() => void} onBattle Called after a battle ran (to refresh counters).
     */
    constructor(onBattle) {
        this.challenges = new ChallengeList(() => onBattle());
        this.ranked = new RankedBattle(() => onBattle());
        this.tournaments = new TournamentsTab();
        this.trainings = new TrainingsTab();
    }

    /** Binds the modes and opens the one named in the URL (`battle.<mode>`). */
    init() {
        this.tournaments.init();
        this.trainings.init();

        const modes = {
            ranked: () => {},
            duel: () => {},
            tourn: () => this.tournaments.refresh({ signal: this.#signal }),
            train: () => this.trainings.refresh({ signal: this.#signal }),
        };
        this.#panel.querySelectorAll('#battle-mode .button').forEach(button => {
            button.addEventListener('click', () => {
                this.#panel.querySelectorAll('#battle-mode .button').forEach(other => other.classList.remove('selected'));
                button.classList.add('selected');
                this.#panel.querySelectorAll('.wrapper').forEach(wrapper => hide(wrapper));
                const wrapper = this.#panel.querySelector(`#${button.id}.wrapper`);
                if (!isVisible(wrapper)) fadeIn(wrapper);
                modes[button.id]?.();
            });
        });

        this.#bindDuel();
    }

    /**
     * Opens the tab: the gladiators for a ranked battle and the duel challenges.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    show(route = {}, { signal } = {}) {
        this.#signal = signal;
        return Promise.all([
            this.ranked.refresh({ signal }),
            this.challenges.refresh({ signal }),
        ]);
    }

    /** The duel part: filter friends, pick one and challenge them. */
    #bindDuel() {
        const wrapper = this.#panel.querySelector('#duel.wrapper');
        const input = wrapper.querySelector('.input');
        const challenge = wrapper.querySelector('#challenge');
        input.addEventListener('input', () => this.#filterFriends(input.value));
        challenge.addEventListener('click', () => {
            if (this.#friend) challengeFriend(this.#friend.nick, this.#friend.user);
        });
        this.#filterFriends('');
    }

    /** @param {string} text Nickname filter. */
    async #filterFriends(text) {
        const signal = this.#signal;
        const request = ++this.#filterRequest;
        const friends = await FriendModel.filter(text, { signal });
        if (signal?.aborted || request !== this.#filterRequest) return;
        const table = this.#panel.querySelector('#duel.wrapper #table-friends');
        const challenge = this.#panel.querySelector('#duel.wrapper #challenge');
        table.replaceChildren();
        (Array.isArray(friends) ? friends : []).forEach(friend => {
            const row = createElement(renderTemplate(friendFilterRowTemplate, { picture: friend.picture, nick: friend.nick }));
            row.addEventListener('click', () => {
                table.querySelectorAll('.row').forEach(other => other.classList.remove('selected'));
                row.classList.add('selected');
                this.#friend = friend;
                challenge.disabled = false;
            });
            table.append(row);
        });
    }
}
