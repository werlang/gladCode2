import { Avatar } from '../components/avatar.js';
import { showMessage } from '../components/dialog.js';
import { GladiatorPicker } from '../components/gladiator-picker.js';
import { SectionCard } from '../components/section-card.js';
import { ProgressButton, runSimulation } from '../components/simulation.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { showBlockedGladiator } from './gladiator-feedback.js';
import { DuelModel } from '../models/social.js';
import { GladiatorModel } from '../models/gladiator.js';
import { settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { duelBoxTemplate } from '../templates/profile.js';
import { battleRowsTemplate, duelChallengeRowTemplate } from '../templates/profile-battle.js';

/**
 * Opens the window where the user picks a gladiator against a friend.
 *
 * @param {string} nick The friend's nickname.
 * @param {string} action Confirm button label.
 * @param {(glad: Record<string, any>, confirm: HTMLButtonElement, fog: HTMLElement) => void} onConfirm
 */
function openDuelBox(nick, action, onConfirm) {
    const fog = createElement(renderTemplate(duelBoxTemplate, { nick, action }));
    document.body.append(fog);
    const confirm = fog.querySelector('#confirm');
    const picker = new GladiatorPicker();
    fog.querySelector('.duel-picker').append(picker.element);
    picker.listen('select', ({ gladiator }) => {
        confirm.disabled = false;
        events.emit(APP_EVENTS.gladiatorChosen, { gladiator, mode: 'duel' });
    });
    picker.listen('blocked', ({ gladiator }) => showBlockedGladiator(gladiator));
    GladiatorModel.list().then(glads => picker.setGladiators(glads)).catch(writeErrorToast);
    fog.querySelector('#cancel').addEventListener('click', () => fog.remove());
    confirm.addEventListener('click', () => {
        const glad = picker.selected;
        if (glad) onConfirm(glad, confirm, fog);
    });
}

/**
 * Challenges a friend to a duel (the API e-mails them).
 *
 * @param {string} nick Friend's nickname.
 * @param {number} friend Friend's user id.
 */
export function challengeFriend(nick, friend) {
    openDuelBox(nick, 'DESAFIAR', async (glad, confirm, fog) => {
        const name = escapeHtml(nick);
        try {
            await DuelModel.challenge({ glad: glad.id, friend });
        }
        catch (error) {
            if (error.code !== 'DUEL_EXISTS') {
                writeErrorToast(error);
                return;
            }
            fog.remove();
            showMessage(`Já existe um desafio de duelo contra <span class='highlight'>${name}</span> usando o gladiador <span class='highlight'>${escapeHtml(glad.name)}</span>.`);
            return;
        }
        fog.remove();
        showMessage(`Desafio enviado para <span class='highlight'>${name}</span>. Assim que uma resposta for dada você será notificado.`);
    });
}

/**
 * The duel challenges waiting for an answer, in the duel part of the BATALHAS tab.
 */
export class ChallengeList {
    #panel = document.querySelector('#duel-challenge');
    #card = null;
    #list = null;

    /**
     * @param {() => void} onDuelFought Called after a duel ran.
     */
    constructor(onDuelFought) {
        this.onDuelFought = onDuelFought;
        this.#card = new SectionCard();
        this.#card.setTitle('Desafios para duelo');
        this.#list = createElement(battleRowsTemplate);
        this.#card.setBody([this.#list]);
        this.#panel.append(this.#card.element);
        this.#panel.hidden = true;
    }

    /** @returns {number} How many challenges are shown. */
    get count() {
        return this.#list.querySelectorAll('.battle-row').length;
    }

    /**
     * Draws the challenges.
     *
     * @param {{ signal?: AbortSignal }} [options]
     */
    async refresh({ signal } = {}) {
        const duels = await settleRequest(() => DuelModel.challenges({ signal }), signal);
        if (!duels || signal?.aborted) return;
        this.#panel.hidden = duels.length === 0;
        this.#list.replaceChildren();
        duels.forEach(duel => {
            const row = createElement(renderTemplate(duelChallengeRowTemplate, {
                level: duel.level,
                nick: duel.nick,
                gladiator: duel.gladiator ?? 'Gladiador removido',
                date: formatMessageTime(duel.time),
                elapsed: formatMessageTime(duel.time, { short: true }),
            }));
            row.querySelector('.battle-row-avatar').append(new Avatar({
                size: 'sm',
                name: duel.nick,
                picture: duel.picture,
                level: duel.level,
            }).element);
            row.querySelector('.refuse').addEventListener('click', () => this.#refuse(row, duel));
            row.querySelector('.accept').addEventListener('click', () => this.#accept(duel));
            this.#list.append(row);
        });
    }

    /**
     * @param {HTMLElement} row Challenge row.
     * @param {Record<string, any>} duel Challenge.
     */
    async #refuse(row, duel) {
        try {
            await DuelModel.remove(duel.id);
        }
        catch (error) {
            writeErrorToast(error);
            return;
        }
        showMessage('Desafio recusado');
        row.remove();
        if (this.count === 0) this.#panel.hidden = true;
    }

    /** @param {Record<string, any>} duel Challenge. */
    accept(duel) {
        this.#accept(duel);
    }

    /** @param {Record<string, any>} duel Challenge. */
    #accept(duel) {
        openDuelBox(duel.nick, 'DUELAR', async (glad, confirm, fog) => {
            const progress = new ProgressButton(confirm, ['Executando batalha...', 'Aguardando resposta do servidor']);
            let log;
            try {
                log = await runSimulation(signal => DuelModel.fight(duel.id, glad.id, { signal }), [glad.name, duel.nick]);
            }
            catch (error) {
                const problems = {
                    DUEL_ANSWERED: 'Este desafio já foi respondido',
                    DUEL_NOT_FOUND: 'Este desafio não existe mais',
                    DUEL_GLADIATOR_GONE: 'O gladiador do desafiante não existe mais',
                    GLADIATOR_OUTDATED: 'Os dois gladiadores precisam estar atualizados para duelar',
                };
                if (problems[error.code]) showMessage(problems[error.code]);
                else writeErrorToast(error);
                log = false;
            }
            progress.kill();
            fog.remove();
            this.onDuelFought();
            if (!log || log === 'ERROR') return;
            await showMessage('Duelo concluído. Clique para visualizar a batalha.');
            window.open(`play/${log}`);
        });
    }
}
