import { showMessage } from '../components/dialog.js';
import { loadSelectableCards } from '../components/glad-card.js';
import { ProgressButton, runSimulation } from '../components/simulation.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { DuelModel } from '../models/social.js';
import { settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { challengeRowTemplate, duelBoxTemplate } from '../templates/profile.js';

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
    const picked = loadSelectableCards(fog.querySelector('.glad-card-container'), confirm);
    fog.querySelector('#cancel').addEventListener('click', () => fog.remove());
    confirm.addEventListener('click', async () => {
        const glad = (await picked)();
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

    /**
     * @param {() => void} onDuelFought Called after a duel ran.
     */
    constructor(onDuelFought) {
        this.onDuelFought = onDuelFought;
    }

    /** @returns {number} How many challenges are shown. */
    get count() {
        return this.#panel.querySelectorAll('.table .row').length;
    }

    /**
     * Draws the challenges.
     *
     * @param {{ signal?: AbortSignal }} [options]
     */
    async refresh({ signal } = {}) {
        const duels = await settleRequest(() => DuelModel.challenges({ signal }), signal);
        if (!duels || signal?.aborted) return;
        const table = this.#panel.querySelector('.table');
        this.#panel.classList.toggle('hidden', duels.length === 0);
        table.replaceChildren();
        duels.forEach(duel => {
            const row = createElement(renderTemplate(challengeRowTemplate, {
                level: duel.level,
                picture: duel.picture,
                nick: duel.nick,
                date: formatMessageTime(duel.time),
                elapsed: formatMessageTime(duel.time, { short: true }),
            }));
            row.querySelector('.refuse').addEventListener('click', () => this.#refuse(row, duel));
            row.querySelector('.accept').addEventListener('click', () => this.#accept(duel));
            table.append(row);
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
        if (this.count === 0) this.#panel.classList.add('hidden');
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
