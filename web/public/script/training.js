import { Countdown, countdownDigitsTemplate } from './components/countdown.js';
import { Message, showMessage } from './components/dialog.js';
import { loadGladCards, gladOfCard } from './components/glad-card.js';
import { showLoginDialog } from './components/header.js';
import { Simulation } from './components/simulation.js';
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
/** A survival time this long means the gladiator outlived everyone. */
const WINNER_TIME = 1000;
/** Wait before asking for a group's battle again after it failed, in ms. */
const RERUN_DELAY_MS = 5000;

const content = document.querySelector('#content-box');

/**
 * A score with one decimal, or none when it is the round maximum of 10.
 *
 * @param {number|string} score Score.
 * @returns {string}
 */
function formatScore(score) {
    const value = parseFloat(score);
    return value === 10 ? String(value) : value.toFixed(1);
}

/**
 * A training round page: its groups, countdowns and battles.
 */
class TrainingRound {
    /** Group id of each group element. */
    #groupIds = new Map();
    /** Team id of each team element. */
    #teamIds = new Map();
    #countdowns = {};

    /**
     * @param {string} hash Training hash.
     * @param {string} round Round number from the URL.
     */
    constructor(hash, round) {
        this.hash = hash;
        this.round = round;
        this.groups = {};
    }

    /** Loads the round and renders it, or the final ranking. */
    async show() {
        const data = await TrainingModel.round(this.hash, this.round);
        if (data.status === 'REDIRECT') {
            location.href = `train/${this.hash}/${data.round}`;
            return;
        }
        Object.assign(this, data);

        if (data.status === 'END') this.#showRanking(data);
        else this.#showRound();
    }

    /**
     * @param {Record<string, any>} data Final ranking answer.
     */
    #showRanking(data) {
        const rows = data.ranking.map((entry, index) => {
            const medal = MEDALS[index] ?? '';
            return renderTemplate(rankingRowTemplate, {
                medal,
                ordinal: medal ? renderTemplate(medalTemplate, { medal, place: index + 1 }) : `${index + 1}º`,
                master: entry.apelido,
                glad: entry.name,
                score: entry.score % 1 ? parseFloat(entry.score).toFixed(1) : parseInt(entry.score, 10),
                time: parseFloat(entry.time).toFixed(1),
            });
        }).join('');

        content.innerHTML = renderTemplate(finalRankingTemplate, { name: this.name, rows });
        content.querySelector('#back-round').addEventListener('click', () => {
            location.href = `train/${this.hash}/${parseInt(this.maxround, 10) - 1}`;
        });
    }

    #showRound() {
        const groupIds = Object.keys(this.groups);
        const groups = groupIds.map((groupId, index) => renderTemplate(groupTemplate, {
            number: index + 1,
            round: this.round,
            teams: Object.values(this.groups[groupId]).map(team => renderTemplate(teamTemplate, {
                mine: team.myteam === true ? 'myteam' : '',
                score: parseInt(team.score, 10),
                master: team.master,
                glad: team.gladiator,
            })).join(''),
        })).join('');

        content.innerHTML = renderTemplate(roundTemplate, {
            name: this.name,
            description: this.description,
            groups,
            roundDigits: countdownDigitsTemplate,
            trainDigits: countdownDigitsTemplate,
        });

        content.querySelectorAll('#group-container .group').forEach((group, index) => {
            const groupId = groupIds[index];
            this.#groupIds.set(group, groupId);
            const teamIds = Object.keys(this.groups[groupId]);
            group.querySelectorAll('.team').forEach((team, teamIndex) => this.#teamIds.set(team, teamIds[teamIndex]));
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

        if (!this.end) this.#startCountdown('train');
        this.refresh({ start: true });
    }

    /**
     * The manager can close the round, rerun a group and set when the round's
     * battles start.
     *
     * @param {HTMLButtonElement} prepare The round button.
     */
    #bindManagerControls(prepare) {
        prepare.disabled = false;
        prepare.onclick = () => {
            prepare.textContent = 'AGUARDE...';
            prepare.disabled = true;
            TrainingModel.setRoundDeadline(this.hash, this.round, 0);
        };

        content.querySelectorAll('#group-container .foot .rerun').forEach(rerun => {
            const group = rerun.closest('.group');
            const button = group.querySelector('.foot .button');
            let tries = 0;
            rerun.addEventListener('click', async () => {
                const groupId = this.#groupIds.get(group);
                const data = await TrainingModel.rerun(this.hash, groupId);
                if (data.status !== 'SUCCESS') return;
                tries++;
                button.disabled = true;
                button.textContent = `Grupo pronto. Organizando batalha... ${tries}`;
                this.groups[groupId].log = false;
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
            TrainingModel.setRoundDeadline(this.hash, this.round, slider.value);
        }
    }

    /**
     * Counts down to the end of the round or of the training.
     *
     * @param {'round'|'train'} mode Which deadline.
     */
    #startCountdown(mode) {
        const deadline = mode === 'train' ? this.train_deadline : this.deadline;
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
     * @param {HTMLElement} group Group element.
     */
    #revealInfo(group) {
        const groupId = this.#groupIds.get(group);
        group.querySelectorAll('.team').forEach(team => {
            const { score, time } = this.groups[groupId][this.#teamIds.get(team)];
            team.querySelector('.glad').textContent = formatScore(score);
            const seconds = parseFloat(time);
            team.querySelector('.time').innerHTML = seconds > WINNER_TIME ? winnerIconTemplate : `${seconds.toFixed(1)}s`;
        });
    }

    /**
     * Updates the round from the server and moves it on: counts down, runs the
     * next battle, waits for the others or opens the next round.
     *
     * @param {{ start?: boolean }} [options] `start` reveals finished groups at once.
     */
    async refresh({ start = false } = {}) {
        const data = await TrainingModel.refresh(this.hash, this.round);
        const prepare = content.querySelector('#prepare');
        this.now = data.now;
        this.deadline = data.deadline;

        if (data.end) {
            this.end = data.end;
            if (prepare) {
                prepare.textContent = 'FIM DO TREINO';
                prepare.onclick = () => {
                    location.href = `train/${this.hash}/0`;
                };
            }
            if (parseInt(this.round, 10) === parseInt(data.maxround, 10)) location.reload();
        }

        Object.entries(this.groups).forEach(([groupId, group]) => {
            const update = data.groups[groupId];
            if (update.locked) {
                group.locked = true;
                content.querySelectorAll('.group .rerun').forEach(rerun => rerun.classList.remove('hidden'));
            }
            if (update.log) {
                group.log = update.log;
                Object.entries(update).forEach(([teamId, team]) => {
                    if (team && typeof team === 'object' && group[teamId]) {
                        group[teamId].score = team.score;
                        group[teamId].time = team.time;
                    }
                });
            }
            if (prepare && !prepare.disabled && group.locked) {
                prepare.onclick = null;
                prepare.textContent = 'AGUARDE...';
                prepare.disabled = true;
            }
        });

        let finished = 0;
        content.querySelectorAll('#group-container .group').forEach(element => {
            const group = this.groups[this.#groupIds.get(element)];
            const button = element.querySelector('.foot .button');
            if (group.log) {
                finished++;
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

        if (data.status === 'SUCCESS' && !data.end) {
            this.#startCountdown('round');
        }
        else if (data.status === 'RUN' && !data.end) {
            this.#runGroup(data.run);
        }
        else if (data.status === 'LOCK') {
            if (finished === Object.keys(this.groups).length) setTimeout(() => this.refresh(), 2000);
        }
        else if (data.status === 'DONE') {
            this.#offerNextRound(data, prepare);
        }

        if (this.round > 1) {
            const back = content.querySelector('#button-container #back-round');
            back.disabled = false;
            back.onclick = () => {
                location.href = `train/${this.hash}/${parseInt(this.round, 10) - 1}`;
            };
        }
    }

    /**
     * Runs a group's battle; a failed run is retried after a pause.
     *
     * @param {string} groupId Group id.
     */
    async #runGroup(groupId) {
        const started = Date.now();
        const result = await new Simulation({ training: groupId, origin: 'train' }).run();
        if (!result.error?.length) return;

        const group = [...this.#groupIds].find(([, id]) => parseInt(id, 10) === parseInt(groupId, 10))?.[0];
        setTimeout(() => group?.querySelector('.foot .rerun')?.click(), RERUN_DELAY_MS - (Date.now() - started));
    }

    /**
     * Every group fought: links the next round and lets the manager end the training.
     *
     * @param {Record<string, any>} data Refresh answer.
     * @param {HTMLButtonElement|null} prepare The round button.
     */
    #offerNextRound(data, prepare) {
        const next = content.querySelector('#button-container #next-round');
        next.disabled = false;
        next.onclick = () => {
            location.href = `train/${this.hash}/${parseInt(this.round, 10) + 1}`;
        };
        if (prepare) {
            prepare.disabled = false;
            prepare.textContent = 'ENCERRAR TREINO';
            prepare.onclick = () => TrainingModel.end(this.hash);
        }
        if (data.newround) TrainingModel.newRound(this.hash, this.round);
    }
}

/**
 * Lets the user pick the gladiator that enters the training.
 *
 * @param {string} hash Invitation hash.
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
        const data = await TrainingModel.join(hash, { glad: selected.id, redirect: true });
        if (data.status !== 'SUCCESS') return;
        fog.querySelector('.glad-box').style.display = 'none';
        await showMessage('Você ingressou no treino');
        location.href = 'battle.train';
    });
}

/**
 * Enters the training of the invitation link: asks for a login, joins, picks
 * a gladiator or shows the running round.
 *
 * @param {string} hash Invitation or training hash.
 * @param {string} round Round number from the URL.
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

    const data = await TrainingModel.join(hash);
    const messages = {
        NOTFOUND: 'Treino não encontrado',
        EXPIRED: 'O código para ingresso deste treino expirou',
    };

    if (data.status === 'JOINED') {
        location.href = 'battle.train';
    }
    else if (data.status === 'ALLOWED') {
        chooseGladiator(hash);
    }
    else if (data.status === 'STARTED') {
        new TrainingRound(hash, round).show();
    }
    else {
        const box = showMessage(messages[data.status] ?? 'Não foi possível ingressar no treino');
        document.querySelector('#fog')?.classList.add('black');
        await box;
        location.href = 'battle.train';
    }
}

start(TemplateVar.get('hash'), TemplateVar.get('round'));
