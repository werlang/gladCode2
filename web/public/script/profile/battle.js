import { createElement, renderTemplate } from '../helpers/html.js';
import { runReadTask, secondaryRequest } from '../helpers/section-request.js';
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

    /** Binds the modes; the route decides which one opens and loads. */
    init() {
        this.tournaments.init();
        this.trainings.init();

        this.#panel.querySelectorAll('#battle-mode .button').forEach(button => {
            button.addEventListener('click', () => {
                this.#selectMode(button.id);
                runReadTask(() => this.#loadMode(button.id), this.#signal);
            });
        });

        this.#bindDuel();
    }

    /**
     * Opens the mode named in the route and loads only what that mode needs.
     *
     * @param {{ subtab?: string }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    show(route = {}, { signal } = {}) {
        this.#signal = signal;
        const mode = ['ranked', 'duel', 'tourn', 'train'].includes(route.subtab) ? route.subtab : 'ranked';
        this.#selectMode(mode);
        return this.#loadMode(mode);
    }

    /**
     * Marks one mode as selected and shows its panel.
     *
     * @param {'ranked'|'duel'|'tourn'|'train'} mode
     */
    #selectMode(mode) {
        this.#panel.querySelectorAll('#battle-mode .button').forEach(button => {
            button.classList.toggle('selected', button.id === mode);
        });
        this.#panel.querySelectorAll('.wrapper').forEach(wrapper => hide(wrapper));
        const wrapper = this.#panel.querySelector(`#${mode}.wrapper`);
        if (!isVisible(wrapper)) fadeIn(wrapper);
    }

    /**
     * Loads the data of one mode; the other modes are not touched.
     *
     * @param {'ranked'|'duel'|'tourn'|'train'} mode
     * @returns {Promise<unknown>}
     */
    #loadMode(mode) {
        const signal = this.#signal;
        if (mode === 'duel') {
            const input = this.#panel.querySelector('#duel.wrapper .input');
            return Promise.all([
                this.challenges.refresh({ signal }),
                this.#filterFriends(input.value),
            ]);
        }
        if (mode === 'tourn') return this.tournaments.refresh({ signal });
        if (mode === 'train') return this.trainings.refresh({ signal });
        return this.ranked.refresh({ signal });
    }

    /** The duel part: filter friends, pick one and challenge them. */
    #bindDuel() {
        const wrapper = this.#panel.querySelector('#duel.wrapper');
        const input = wrapper.querySelector('.input');
        const challenge = wrapper.querySelector('#challenge');
        input.addEventListener('input', () => runReadTask(() => this.#filterFriends(input.value), this.#signal));
        challenge.addEventListener('click', () => {
            if (this.#friend) challengeFriend(this.#friend.nick, this.#friend.user);
        });
    }

    /** @param {string} text Nickname filter. */
    async #filterFriends(text) {
        const signal = this.#signal;
        const request = ++this.#filterRequest;
        const friends = await secondaryRequest(() => FriendModel.filter(text, { signal }), signal);
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
