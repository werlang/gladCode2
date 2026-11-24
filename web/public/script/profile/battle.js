import { Avatar } from '../components/avatar.js';
import { ChoiceCards } from '../components/choice-cards.js';
import { InviteBanner } from '../components/invite-banner.js';
import { PageHeader } from '../components/page-header.js';
import { Pagination } from '../components/pagination.js';
import { SectionCard } from '../components/section-card.js';
import { createToast } from '../components/toast.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { runReadTask, secondaryRequest, writeErrorToast } from '../helpers/section-request.js';
import { DuelModel, FriendModel } from '../models/social.js';
import { TournamentModel } from '../models/tournament.js';
import { TrainingModel } from '../models/training.js';
import { icon } from '../templates/icons.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { battleShellTemplate, duelFriendsTemplate } from '../templates/profile-battle.js';
import { friendFilterRowTemplate } from '../templates/profile.js';
import { ChallengeList, challengeFriend } from './duels.js';
import { RankedBattle } from './ranked.js';
import { TournamentsTab } from './tournaments.js';
import { TrainingsTab } from './trainings.js';

const MODES = ['ranked', 'duel', 'tourn', 'train'];

/**
 * The invite's sub-line. The API has no expiry for a duel challenge, so the board sample's
 * “Responda em até 2 dias.” must never be invented; only the challenger's gladiator is real data.
 *
 * @param {{ gladiator?: string }|null} duel
 * @returns {string}
 */
export function duelInviteDetail(duel) {
    const gladiator = String(duel?.gladiator ?? '').trim();
    return gladiator ? `Luta com ${gladiator}.` : '';
}

/**
 * The full payload the InviteBanner receives. Keeping it pure lets the invite contract be tested
 * without the API or the DOM.
 *
 * @param {{ nick?: string, picture?: string, gladiator?: string }|null} duel
 * @returns {{ picture?: string, name: string, message: string, detail: string,
 *   acceptLabel: string, refuseLabel: string }}
 */
export function duelInviteData(duel) {
    const nick = duel?.nick ?? '';
    return {
        picture: duel?.picture,
        name: nick,
        message: `${nick || 'Um mestre'} desafiou você para um duelo`,
        detail: duelInviteDetail(duel),
        acceptLabel: 'Escolher gladiador e aceitar',
        refuseLabel: 'Recusar',
    };
}

/**
 * The BATALHAS section: a pending duel invite, the four mode cards and the ranked character select,
 * with the existing duel, tournament and training flows kept behind their cards.
 */
export class BattleTab {
    #root = document.querySelector('#panel #battle-container');
    #built = false;
    #header = null;
    #modes = null;
    #invite = null;
    #friend = null;
    #friends = [];
    #friendPage = 1;
    #friendPager = null;
    #signal = null;
    #mode = 'ranked';
    #duels = [];
    #tournOpen = 0;
    #trainActive = 0;
    #filterRequest = 0;

    /**
     * @param {() => void} onBattle Called after a battle ran (to refresh counters).
     */
    constructor(onBattle) {
        this.onBattle = onBattle;
    }

    /** @returns {string} The mode currently shown. */
    get mode() {
        return this.#mode;
    }

    /** Builds the section and binds the modes; called by the shell on start. */
    init() {
        this.#build();
        this.tournaments.init();
        this.trainings.init();
        this.#bindDuel();
    }

    /** Builds the section once. */
    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(battleShellTemplate);
        this.#root.querySelector('#battle-header').append(createElement(pageHeaderTemplate));
        this.#header = new PageHeader({ element: this.#root.querySelector('#battle-header > .page-header') });
        this.#header.set({ title: 'Batalhas', subtitle: 'Escolha onde seus gladiadores vão lutar.' });

        this.#modes = new ChoiceCards({ element: this.#root.querySelector('#battle-modes'), variant: 'mode', label: 'Modo de batalha' });
        this.#modes.listen('change', ({ value }) => {
            this.#selectMode(value);
            runReadTask(() => this.#loadMode(value), this.#signal);
        });

        this.#invite = new InviteBanner();
        this.#root.querySelector('#battle-invite').append(this.#invite.element);
        this.#invite.listen('accept', () => this.#acceptInvite());
        this.#invite.listen('refuse', () => this.#refuseInvite());
        this.#buildDuel();

        this.ranked = new RankedBattle(() => this.#afterBattle());
        this.challenges = new ChallengeList(() => this.#afterBattle());
        this.tournaments = new TournamentsTab();
        this.trainings = new TrainingsTab();
        this.#renderModes();
        this.#built = true;
    }

    /**
     * Opens the mode named in the route and loads only what that mode needs.
     *
     * @param {{ subtab?: string }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        if (signal?.aborted) return;
        this.#build();
        this.#signal = signal;
        const mode = MODES.includes(route.subtab) ? route.subtab : 'ranked';
        this.#selectMode(mode);
        const selectId = new URLSearchParams(location.search).get('glad');
        await Promise.allSettled([
            this.#refreshInvite(signal),
            this.#loadCounts(signal),
            this.#loadMode(mode, selectId),
        ]);
    }

    /** Builds the friend-search card of the duel mode. */
    #buildDuel() {
        const root = this.#root.querySelector('#duel-friends');
        const card = new SectionCard();
        card.setTitle('Desafiar um amigo');
        card.setBody([createElement(duelFriendsTemplate)]);
        card.setActions([createElement("<button type='button' id='challenge' class='button primary small' disabled>Desafiar</button>")]);
        this.#friendPager = new Pagination({ variant: 'simple' });
        this.#friendPager.listen('change', ({ page }) => {
            this.#friendPage = page;
            this.#renderFriends();
        });
        card.body.append(this.#friendPager.element);
        root.append(card.element);
    }

    /** @param {string} mode */
    #selectMode(mode) {
        if (mode !== 'ranked') this.ranked?.cancelPending?.();
        this.#mode = mode;
        if (this.#modes) this.#modes.set(mode, { silent: true });
        if (!this.#root) return;
        this.#root.querySelectorAll('.battle-panel').forEach(panel => { panel.hidden = panel.id !== mode; });
    }

    /**
     * @param {'ranked'|'duel'|'tourn'|'train'} mode
     * @param {string|null} [selectId]
     * @returns {Promise<unknown>}
     */
    #loadMode(mode, selectId = null) {
        const signal = this.#signal;
        if (mode === 'duel') {
            const input = this.#root.querySelector('#duel.wrapper .input');
            return Promise.all([
                this.challenges.refresh({ signal }),
                this.#filterFriends(input?.value ?? ''),
            ]);
        }
        if (mode === 'tourn') return this.tournaments.refresh({ signal });
        if (mode === 'train') return this.trainings.refresh({ signal });
        return this.ranked.refresh({ signal, selectId });
    }

    /** The pending invite banner and the duel mode's counts. @param {AbortSignal} signal */
    async #refreshInvite(signal) {
        const duels = await secondaryRequest(() => DuelModel.challenges({ signal }), signal);
        if (signal?.aborted) return;
        this.#duels = Array.isArray(duels) ? duels : [];
        const duel = this.#duels[0];
        if (!duel) {
            this.#invite.clear();
        }
        else {
            this.#invite.set(duelInviteData(duel));
        }
        this.#renderModes();
    }

    /** @param {AbortSignal} signal */
    async #loadCounts(signal) {
        const [tournaments, trainings] = await Promise.all([
            secondaryRequest(() => TournamentModel.list({ mine: 0, open: 0 }, { signal }), signal),
            secondaryRequest(() => TrainingModel.list({ manage: 0, part: 0 }, { signal }), signal),
        ]);
        if (signal?.aborted) return;
        this.#tournOpen = Number(tournaments?.pages?.open?.total ?? 0);
        this.#trainActive = Number(trainings?.pages?.part?.total ?? 0) + Number(trainings?.pages?.manage?.total ?? 0);
        this.#renderModes();
    }

    /** Rebuilds the mode card badges without losing the selected mode. */
    #renderModes() {
        if (!this.#modes) return;
        const duelCount = this.#duels.length;
        this.#modes.setOptions([
            {
                value: 'ranked',
                title: 'Ranqueada',
                description: 'Um adversário do seu nível. Vale renome e prata.',
                preview: icon('battle', { size: 22 }),
                badge: 'Fila aberta',
            },
            {
                value: 'duel',
                title: 'Duelo',
                description: 'Desafie um amigo, gladiador contra gladiador.',
                preview: icon('friends', { size: 22 }),
                badge: duelCount ? `${duelCount} desafio${duelCount === 1 ? '' : 's'}` : 'Nenhum desafio',
                alert: duelCount > 0,
            },
            {
                value: 'tourn',
                title: 'Torneio',
                description: 'Equipes em rodadas, até sobrar uma.',
                preview: icon('ranking', { size: 22 }),
                badge: `${this.#tournOpen} aberto${this.#tournOpen === 1 ? '' : 's'}`,
            },
            {
                value: 'train',
                title: 'Treino',
                description: 'Rodadas para turmas, com placar por equipe.',
                preview: icon('glads', { size: 22 }),
                badge: `${this.#trainActive} ativo${this.#trainActive === 1 ? '' : 's'}`,
            },
        ]);
        this.#modes.set(this.#mode, { silent: true });
    }

    /** The duel part: filter friends, pick one and challenge them. */
    #bindDuel() {
        const wrapper = this.#root.querySelector('#duel.wrapper');
        const input = wrapper?.querySelector('.input');
        const challenge = wrapper?.querySelector('#challenge');
        if (!wrapper || !input || !challenge) return;
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
        this.#friends = Array.isArray(friends) ? friends : [];
        this.#friendPage = 1;
        this.#renderFriends();
    }

    /** Draws the current page of the friend filter and its pagination. */
    #renderFriends() {
        const table = this.#root.querySelector('#duel.wrapper #table-friends');
        const challenge = this.#root.querySelector('#duel.wrapper #challenge');
        if (!table || !challenge) return;
        const total = this.#friends.length;
        const pages = Math.max(1, Math.ceil(total / 10));
        this.#friendPage = Math.max(1, Math.min(this.#friendPage, pages));
        this.#friend = null;
        challenge.disabled = true;
        this.#friendPager.element.hidden = total === 0;
        this.#friendPager.set({ page: this.#friendPage, pages, total, pageSize: 10 });
        table.replaceChildren();
        const start = (this.#friendPage - 1) * 10;
        for (const friend of this.#friends.slice(start, start + 10)) {
            const row = createElement(renderTemplate(friendFilterRowTemplate, { nick: friend.nick }));
            row.querySelector('.friend-avatar').append(new Avatar({ size: 'sm', name: friend.nick, picture: friend.picture, level: friend.level }).element);
            row.addEventListener('click', () => {
                table.querySelectorAll('.row').forEach(other => other.classList.remove('selected'));
                row.classList.add('selected');
                this.#friend = friend;
                challenge.disabled = false;
            });
            table.append(row);
        }
    }

    /** Accepts the banner's first challenge through the shared picker. */
    #acceptInvite() {
        const duel = this.#duels[0];
        if (!duel) return;
        this.challenges.accept(duel);
    }

    /** Refuses the banner's first challenge. */
    async #refuseInvite() {
        const duel = this.#duels[0];
        if (!duel) return;
        this.#invite.setBusy(true);
        try {
            await DuelModel.remove(duel.id);
            createToast('Desafio recusado', 'success');
            await this.#refreshInvite(this.#signal);
            await this.challenges.refresh({ signal: this.#signal });
        }
        catch (error) {
            writeErrorToast(error);
        }
        finally {
            this.#invite.setBusy(false);
        }
    }

    /** Refreshes the counters and the banner after a battle or a challenge change. */
    #afterBattle() {
        this.onBattle?.();
        runReadTask(() => this.#refreshInvite(this.#signal), this.#signal);
        runReadTask(() => this.#loadCounts(this.#signal), this.#signal);
    }
}
