import { Countdown, countdownDigitsTemplate } from './components/countdown.js';
import { Message, showMessage } from './components/dialog.js';
import { loadGladCards, gladOfCard } from './components/glad-card.js';
import { showLoginDialog } from './components/header.js';
import { Slider } from './components/slider.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { TemplateVar } from './helpers/template-var.js';
import { TrainingModel } from './models/training.js';
import { UserModel } from './models/user.js';
import {
    finalRankingTemplate,
    gladBoxTemplate,
    groupTemplate,
    medalTemplate,
    rankingRowTemplate,
    roundTemplate,
    roundTimeTemplate,
    teamTemplate,
    winnerIconTemplate,
} from './templates/training.js';

const MEDALS = ['gold', 'silver', 'bronze'];
/** How often the page asks again while battles run, in ms. */
const BUSY_POLL_MS = 2000;
/** How often the page asks again while the manager has not set the round time, in ms. */
const WAIT_POLL_MS = 5000;

const content = document.querySelector('#content-box');

/** What to tell a master an invitation does not work, by API error code. */
const INVITATION_ERRORS = {
    TRAINING_NOT_FOUND: 'Treino não encontrado',
    INVITATION_EXPIRED: 'O código para ingresso deste treino expirou',
    TRAINING_STARTED: 'Este treino já iniciou',
};

/**
 * A score with one decimal, or none when it is the round maximum of 10.
 *
 * @param {number} score Score.
 * @returns {string}
 */
function formatScore(score) {
    return score === 10 ? String(score) : score.toFixed(1);
}

/**
 * A training round page: its groups, countdowns and battles. While the page is
 * open it moves the training on: once the round's time is up it asks the API to
 * fight the next group, and to open the next round when every group fought.
 */
class TrainingRound {
    /** Group of each group element. */
    #groupOf = new Map();
    /** Team id of each team element. */
    #teamIds = new Map();
    #countdowns = {};
    #advancing = false;
    #openedNext = false;
    #poll = null;

    /**
     * @param {string} hash Training code.
     * @param {number} round Round number from the URL.
     */
    constructor(hash, round) {
        this.hash = hash;
        this.round = round;
    }

    /** Loads the round and renders it, or the final ranking. */
    async show() {
        const data = await TrainingModel.round(this.hash, this.round);
        if (data.status === 'redirect') {
            location.href = `train/${this.hash}/${data.round}`;
            return;
        }
        if (data.status === 'end') this.#showRanking(data);
        else this.#showRound(data);
    }

    /**
     * @param {{ name: string, lastRound: number, ranking: Array<{ gladiator: string, master: string, score: number, time: number }> }} data
     */
    #showRanking(data) {
        const rows = data.ranking.map((entry, index) => {
            const medal = MEDALS[index] ?? '';
            return renderTemplate(rankingRowTemplate, {
                medal,
                ordinal: medal ? renderTemplate(medalTemplate, { medal, place: index + 1 }) : `${index + 1}º`,
                master: entry.master,
                glad: entry.gladiator,
                score: entry.score % 1 ? entry.score.toFixed(1) : entry.score,
                time: entry.time.toFixed(1),
            });
        }).join('');

        content.innerHTML = renderTemplate(finalRankingTemplate, { name: data.name, rows });
        content.querySelector('#back-round').addEventListener('click', () => {
            location.href = `train/${this.hash}/${data.lastRound}`;
        });
    }

    /**
     * @param {Record<string, any>} data Round answer.
     */
    #showRound(data) {
        this.manager = data.manager;
        this.end = data.end;
        this.now = data.now;
        this.deadline = data.deadline;
        this.trainDeadline = data.trainDeadline;
        this.groups = data.groups.map(group => ({ ...group, log: null, locked: false, results: new Map() }));

        const groups = this.groups.map((group, index) => renderTemplate(groupTemplate, {
            number: index + 1,
            round: this.round,
            teams: group.teams.map(team => renderTemplate(teamTemplate, {
                mine: team.mine ? 'myteam' : '',
                score: Math.trunc(team.score),
                master: team.master,
                glad: team.gladiator,
            })).join(''),
        })).join('');

        content.innerHTML = renderTemplate(roundTemplate, {
            name: data.name,
            description: data.description,
            groups,
            roundDigits: countdownDigitsTemplate,
            trainDigits: countdownDigitsTemplate,
        });

        content.querySelectorAll('#group-container .group').forEach((element, index) => {
            const group = this.groups[index];
            this.#groupOf.set(element, group);
            element.querySelectorAll('.team').forEach((team, teamIndex) => this.#teamIds.set(team, group.teams[teamIndex].id));
        });

        const prepare = content.querySelector('#prepare');
        if (this.manager) {
            this.#bindManagerControls(prepare);
        }
        if (!this.manager || this.end) {
            prepare.remove();
            content.querySelectorAll('#button-container .arrow').forEach(arrow => arrow.classList.add('nobutton'));
            content.querySelectorAll('#group-container .foot .rerun').forEach(rerun => rerun.remove());
        }

        if (this.round > 1) {
            const back = content.querySelector('#button-container #back-round');
            back.disabled = false;
            back.onclick = () => {
                location.href = `train/${this.hash}/${this.round - 1}`;
            };
        }

        if (!this.end) this.#startCountdown('train');
        this.refresh({ start: true });
    }

    /**
     * The manager can start the round's battles now, rerun a group and set when
     * the round's battles start.
     *
     * @param {HTMLButtonElement} prepare The round button.
     */
    #bindManagerControls(prepare) {
        prepare.disabled = false;
        prepare.onclick = async () => {
            prepare.textContent = 'AGUARDE...';
            prepare.disabled = true;
            await TrainingModel.setRoundDeadline(this.hash, this.round, 0);
            this.refresh();
        };

        content.querySelectorAll('#group-container .foot .rerun').forEach(rerun => {
            const element = rerun.closest('.group');
            const button = element.querySelector('.foot .button');
            rerun.addEventListener('click', async () => {
                const group = this.#groupOf.get(element);
                try {
                    await TrainingModel.rerun(this.hash, group.id);
                }
                catch (error) {
                    if (error.code !== 'ROUND_OVER') throw error;
                    showMessage('Esta rodada já terminou. Apenas os grupos da última rodada podem lutar novamente');
                    return;
                }
                group.log = null;
                button.disabled = true;
                button.onclick = null;
                button.textContent = 'Grupo pronto. Organizando batalha...';
                this.refresh();
            });
        });

        if (this.deadline === null) this.#askRoundTime();
    }

    /** Asks the manager how long until the round's battles start. */
    async #askRoundTime() {
        const box = new Message({
            message: renderTemplate(roundTimeTemplate, { round: this.round }),
            buttons: { ok: 'OK', cancel: 'Cancelar' },
        }).show();
        const slider = new Slider(box.element.querySelector('#slider'), {
            range: 'min',
            min: 0,
            max: 15,
            step: 1,
            value: 5,
            label: value => `${value}m`,
            ariaLabel: 'Minutos até o início das batalhas',
        });

        const { button } = await box.wait();
        if (button === 'ok') {
            await TrainingModel.setRoundDeadline(this.hash, this.round, slider.value);
            this.refresh();
        }
    }

    /**
     * Counts down to the end of the round or of the training.
     *
     * @param {'round'|'train'} mode Which deadline.
     */
    #startCountdown(mode) {
        const deadline = mode === 'train' ? this.trainDeadline : this.deadline;
        if (!deadline) return;
        const box = content.querySelector(`.timeleft.${mode}`);

        this.#countdowns[mode]?.stop();
        this.#countdowns[mode] = new Countdown(box, {
            deadline,
            now: this.now,
            onTick: (left, [hours, minutes]) => {
                if (parseInt(hours, 10) > 0) {
                    box.classList.add('green');
                }
                else if (parseInt(minutes, 10) < 10) {
                    box.classList.replace('yellow', 'red') || box.classList.add('red');
                }
                else {
                    box.classList.replace('green', 'yellow') || box.classList.add('yellow');
                }
            },
            onEnd: () => this.refresh(),
        }).start();
    }

    /**
     * Shows a group's scores and survival times.
     *
     * @param {HTMLElement} element Group element.
     */
    #revealInfo(element) {
        const group = this.#groupOf.get(element);
        element.querySelectorAll('.team').forEach(team => {
            const result = group.results.get(this.#teamIds.get(team));
            if (!result) return;
            team.querySelector('.glad').textContent = formatScore(result.score);
            team.querySelector('.time').innerHTML = result.winner ? winnerIconTemplate : `${result.time.toFixed(1)}s`;
        });
    }

    /**
     * Asks again after a pause, replacing any pending ask.
     *
     * @param {number} delay In ms.
     */
    #refreshLater(delay) {
        clearTimeout(this.#poll);
        this.#poll = setTimeout(() => this.refresh(), delay);
    }

    /**
     * Updates the round from the server and moves it on: counts down, fights the
     * next group, waits for the others or opens the next round.
     *
     * @param {{ start?: boolean }} [options] `start` reveals fought groups at once.
     */
    async refresh({ start = false } = {}) {
        clearTimeout(this.#poll);
        const data = await TrainingModel.refresh(this.hash, this.round);
        const prepare = content.querySelector('#prepare');
        this.now = data.now;
        this.deadline = data.deadline;

        if (data.end) {
            this.end = true;
            // the round opened just before the time ran out never fights: show the ranking
            if (this.round === data.maxRound && !data.groups.some(group => group.log)) {
                location.href = `train/${this.hash}/0`;
                return;
            }
            if (prepare) {
                prepare.disabled = false;
                prepare.textContent = 'FIM DO TREINO';
                prepare.onclick = () => {
                    location.href = `train/${this.hash}/0`;
                };
            }
        }

        for (const update of data.groups) {
            const group = this.groups.find(entry => entry.id === update.id);
            if (!group) continue;
            group.locked = update.locked;
            group.log = update.log;
            group.results = new Map(update.teams.map(team => [team.id, team]));
        }

        content.querySelectorAll('#group-container .group').forEach(element => {
            const group = this.#groupOf.get(element);
            const button = element.querySelector('.foot .button');
            if (group.locked || group.log) element.querySelector('.foot .rerun')?.classList.remove('hidden');
            if (group.log) {
                if (start) this.#revealInfo(element);
                button.disabled = false;
                button.textContent = 'VISUALIZAR BATALHA';
                button.onclick = () => {
                    window.open(`play/${group.log}`);
                    setTimeout(() => this.#revealInfo(element), 1500);
                };
            }
            else if (group.locked) {
                button.textContent = 'Grupo pronto. Organizando batalha...';
            }
        });

        if (prepare && !data.end && this.groups.some(group => group.locked || group.log)) {
            prepare.onclick = null;
            prepare.textContent = 'AGUARDE...';
            prepare.disabled = true;
        }

        if (data.status === 'open') this.#startCountdown('round');
        else if (data.status === 'run') this.#advance();
        else if (data.status === 'busy') this.#refreshLater(BUSY_POLL_MS);
        else if (data.status === 'wait') this.#refreshLater(WAIT_POLL_MS);
        else if (data.status === 'done') this.#offerNextRound(data, prepare);
    }

    /**
     * Asks the API to move the training on (fight the next group, or open the
     * next round), then shows where it stands. A battle that failed keeps its
     * group busy for a few minutes, after which a page tries it again.
     */
    async #advance() {
        if (this.#advancing) return;
        this.#advancing = true;
        try {
            const { status } = await TrainingModel.advance(this.hash);
            // nothing was due after all: ask again later rather than at once
            if (status === 'wait') {
                this.#refreshLater(WAIT_POLL_MS);
                return;
            }
        }
        catch {
            // another viewer's page, or this one on its next ask, moves it on
            this.#refreshLater(WAIT_POLL_MS);
            return;
        }
        finally {
            this.#advancing = false;
        }
        this.refresh();
    }

    /**
     * Every group fought: links the next round, opens it if needed and lets the
     * manager end the training.
     *
     * @param {{ end: boolean, maxRound: number }} data Status answer.
     * @param {HTMLButtonElement|null} prepare The round button.
     */
    #offerNextRound(data, prepare) {
        if (data.end) return;
        const next = content.querySelector('#button-container #next-round');
        next.disabled = false;
        next.onclick = () => {
            location.href = `train/${this.hash}/${this.round + 1}`;
        };
        if (prepare) {
            prepare.disabled = false;
            prepare.textContent = 'ENCERRAR TREINO';
            prepare.onclick = async () => {
                prepare.disabled = true;
                await TrainingModel.end(this.hash);
                this.refresh();
            };
        }
        if (this.round === data.maxRound && !this.#openedNext) {
            this.#openedNext = true;
            this.#advance();
        }
    }
}

/**
 * Lets the user pick the gladiator that enters the training.
 *
 * @param {string} hash Invitation code.
 */
async function chooseGladiator(hash) {
    const fog = createElement(gladBoxTemplate);
    document.body.append(fog);
    const select = fog.querySelector('#select');
    let selected = null;

    await loadGladCards(fog.querySelector('.glad-card-container'), {
        onClick: event => {
            const card = event.currentTarget;
            if (card.classList.contains('old')) return;
            fog.querySelectorAll('.glad-preview').forEach(other => other.classList.remove('selected'));
            card.classList.add('selected');
            selected = gladOfCard(card);
            select.disabled = false;
        },
        onDoubleClick: () => {
            if (selected) select.click();
        },
    });

    select.addEventListener('click', async () => {
        let training;
        try {
            training = await TrainingModel.join(hash, selected.id);
        }
        catch (error) {
            if (!error.code) throw error;
            showMessage(INVITATION_ERRORS[error.code] ?? 'Não foi possível ingressar no treino');
            return;
        }
        fog.querySelector('.glad-box').style.display = 'none';
        await showMessage('Você ingressou no treino');
        location.href = `battle.train?room=${training.id}`;
    });
}

/**
 * Enters the training of the invitation link: asks for a login, joins, picks
 * a gladiator or shows the running round.
 *
 * @param {string} hash Invitation or training code.
 * @param {number} round Round number from the URL.
 */
async function start(hash, round) {
    const user = await UserModel.current();
    if (!UserModel.isLogged(user)) {
        const { button } = await new Message({
            message: 'Você precisa realizar o login para ingressar em um treino',
            buttons: { login: 'Login', no: 'Não' },
        }).show().wait();
        if (button === 'no') location.href = '';
        else showLoginDialog();
        return;
    }

    let training;
    try {
        training = await TrainingModel.invitation(hash);
    }
    catch (error) {
        if (!error.code) throw error;
        const box = showMessage(INVITATION_ERRORS[error.code] ?? 'Não foi possível ingressar no treino');
        document.querySelector('#fog')?.classList.add('black');
        await box;
        location.href = 'battle.train';
        return;
    }

    if (training.status === 'joined') location.href = `battle.train?room=${training.id}`;
    else if (training.status === 'open') chooseGladiator(hash);
    else new TrainingRound(hash, round).show();
}

start(TemplateVar.get('hash'), Number(TemplateVar.get('round')) || 0);
