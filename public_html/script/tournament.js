import './blocks.js';
import { Countdown, countdownDigitsTemplate } from './components/countdown.js';
import { showMessage } from './components/dialog.js';
import { gladOfCard, loadGladCards } from './components/glad-card.js';
import { runSimulation } from './components/simulation.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { TournamentModel } from './models/tournament.js';
import {
    chooseGladTemplate,
    finalRankingTemplate,
    groupTemplate,
    medalTemplate,
    rankingRowTemplate,
    reloadButtonTemplate,
    roundTemplate,
    teamTemplate,
    winnerIconTemplate,
} from './templates/tournament.js';

const MEDALS = ['gold', 'silver', 'bronze'];
/** Class showing how many of the team's three gladiators are left. */
const ALIVE_CLASSES = ['', 'one', 'two', 'three'];
/** A survival time this long means the gladiator outlived everyone. */
const WINNER_TIME = 1000;

const content = document.querySelector('#content-box');

/**
 * Reads and removes a value the page left in a hidden element.
 *
 * @param {string} id Element id.
 * @returns {string}
 */
function takeHidden(id) {
    const element = document.getElementById(id);
    const value = element?.textContent ?? '';
    element?.remove();
    return value;
}

/**
 * A tournament round page: groups of teams, the countdown to the battles,
 * choosing the team's gladiator and, for the manager, running the battles.
 */
class TournamentRound {
    /** Group id of each group element. */
    #groupIds = new Map();
    /** Team id of each team element. */
    #teamIds = new Map();
    /** Groups whose result the visitor opened, so their scores show. */
    #revealed = new Set();
    #manager = false;

    /**
     * @param {string} hash Tournament hash.
     * @param {string} round Round number from the URL.
     */
    constructor(hash, round) {
        this.hash = hash;
        this.round = round;
    }

    /** Loads the round and renders it, the final ranking or a redirect. */
    async show() {
        const data = await TournamentModel.round(this.hash, this.round);
        if (data.status === 'REDIRECT') {
            location.href = `tourn/${this.hash}/${data.round}`;
        }
        else if (data.status === 'NOTFOUND') {
            location.href = 'index';
        }
        else if (data.status === 'END') {
            this.#showRanking(data);
        }
        else {
            this.#showRound(data);
        }
    }

    /**
     * @param {Record<string, any>} data Final ranking answer.
     */
    #showRanking(data) {
        const rows = data.ranking.map((name, index) => {
            const medal = MEDALS[index] ?? '';
            return renderTemplate(rankingRowTemplate, {
                medal,
                ordinal: medal ? renderTemplate(medalTemplate, { medal, place: index + 1 }) : `${index + 1}º`,
                name,
            });
        }).join('');
        content.innerHTML = renderTemplate(finalRankingTemplate, { name: data.tournament, rows });
        content.querySelector('#back-round').addEventListener('click', () => {
            location.href = `tourn/${this.hash}/${data.maxround}`;
        });
    }

    /**
     * @param {Record<string, any>} data Round answer.
     */
    #showRound(data) {
        const { tournament } = data;
        const groupOrder = [];
        const teamsByGroup = new Map();
        data.teams.forEach(team => {
            if (!teamsByGroup.has(team.group)) {
                teamsByGroup.set(team.group, []);
                groupOrder.push(team.group);
            }
            teamsByGroup.get(team.group).push(team);
        });

        const groups = groupOrder.map((groupId, index) => renderTemplate(groupTemplate, {
            number: index + 1,
            round: tournament.round,
            teams: teamsByGroup.get(groupId).map(team => renderTemplate(teamTemplate, {
                mine: team.myteam === true ? 'myteam' : '',
                name: team.name,
            })).join(''),
        })).join('');

        content.innerHTML = renderTemplate(roundTemplate, {
            name: tournament.name,
            description: tournament.description,
            groups,
            digits: countdownDigitsTemplate,
        });

        content.querySelectorAll('#group-container .group').forEach((group, index) => {
            const groupId = groupOrder[index];
            this.#groupIds.set(group, groupId);
            group.querySelectorAll('.team').forEach((team, teamIndex) => {
                this.#teamIds.set(team, teamsByGroup.get(groupId)[teamIndex].id);
            });
        });

        this.refresh();

        const round = parseInt(tournament.round, 10);
        if (round > 1) {
            const back = content.querySelector('#back-round');
            back.disabled = false;
            back.addEventListener('click', () => {
                location.href = `tourn/${this.hash}/${round - 1}`;
            });
        }

        this.#manager = Boolean(tournament.manager);
        const myTeam = data.teams.find(team => team.myteam === true);
        const prepare = content.querySelector('#prepare');
        if (myTeam) {
            prepare.textContent = 'PREPARAR-SE';
            prepare.disabled = false;
            if (data.locked) this.#lockPrepare(prepare);
            prepare.onclick = () => this.#prepare(tournament.round, data.nick, myTeam.name, prepare);
        }
        else if (this.#manager) {
            prepare.textContent = 'ENCERRAR RODADA';
            prepare.disabled = false;
            prepare.onclick = () => {
                prepare.textContent = 'AGUARDE...';
                prepare.disabled = true;
                TournamentModel.endTurn(this.hash);
            };
        }
        else {
            prepare.remove();
            content.querySelectorAll('#button-container .arrow').forEach(arrow => arrow.classList.add('nobutton'));
        }

        this.#startCountdown(tournament.deadline, tournament.timenow);
    }

    /**
     * @param {HTMLButtonElement|null} prepare The round button.
     */
    #lockPrepare(prepare) {
        if (!prepare) return;
        prepare.disabled = true;
        prepare.textContent = 'Aguarde a nova rodada';
    }

    /**
     * Counts down to the round's deadline: green once the user's team is
     * ready, yellow in the last hour and red in the last ten minutes.
     *
     * @param {string} deadline Round deadline (server time).
     * @param {string} now Server time.
     */
    #startCountdown(deadline, now) {
        const box = content.querySelector('.timeleft');
        const countdown = new Countdown(box, {
            deadline,
            now,
            onTick: (left, [hours, minutes]) => {
                if (content.querySelectorAll('#group-container .team.myteam .icon .green').length === 1) {
                    box.classList.add('green');
                }
                else if (parseInt(hours, 10) === 0) {
                    box.classList.add(parseInt(minutes, 10) < 10 ? 'red' : 'yellow');
                }

                const teams = content.querySelectorAll('#group-container .team');
                const ready = content.querySelectorAll('#group-container .team .icon .green');
                if (teams.length && ready.length === teams.length) {
                    countdown.show(['00', '00', '00']);
                    countdown.stop();
                }
            },
        });
        countdown.start();
    }

    /**
     * Lets the user choose the gladiator that represents the team this round.
     *
     * @param {number|string} round Round number.
     * @param {string} nick The user's nickname.
     * @param {string} team The team's name.
     * @param {HTMLButtonElement} prepare The round button.
     */
    async #prepare(round, nick, team, prepare) {
        const data = await TournamentModel.teamGladiators(this.hash, round);
        if (data.status === 'LOCK') {
            showMessage('Tarde demais. Seu grupo já encerrou as inscrições');
            this.#lockPrepare(prepare);
            return;
        }
        if (data.status === 'NOTFOUND') {
            showMessage('Lista de gladiadores não encontrada');
            return;
        }

        const fog = createElement(renderTemplate(chooseGladTemplate, { nick, team, round }));
        document.body.append(fog);
        const choose = fog.querySelector('#choose');
        let selected = null;

        fog.querySelector('#cancel').addEventListener('click', () => fog.remove());
        choose.addEventListener('click', async () => {
            const answer = await TournamentModel.choose(this.hash, selected.id);
            if (answer.status === 'DEAD') {
                showMessage('Este gladiador está gravemente ferido e não poderá mais participar deste torneio');
            }
            else if (answer.status === 'OLD') {
                showMessage('Este gladiador está desatualizado e não pode ser escolhido. Para atualizá-lo, altere ele no editor e salve-o');
            }
            else if (answer.status === 'SUCCESS') {
                fog.remove();
                showMessage(`Sua equipe escolheu o gladiador <span class='highlight'>${selected.name}</span> para participar desta rodada. Assim que todas equipes escolherem seus representantes a batalha iniciará.`);
            }
        });

        const selectable = card => !card.classList.contains('dead') && !card.classList.contains('old');
        await loadGladCards(fog.querySelector('.glad-card-container'), {
            glads: data.glads,
            code: true,
            master: true,
            dead: true,
            onClick: event => {
                const card = event.currentTarget;
                if (!selectable(card)) return;
                fog.querySelectorAll('.glad-preview').forEach(other => other.classList.remove('selected'));
                card.classList.add('selected');
                selected = gladOfCard(card);
                choose.disabled = false;
            },
            onDoubleClick: event => {
                if (selectable(event.currentTarget)) choose.click();
            },
        });
    }

    /**
     * Runs a group's battle (manager only), then refreshes the round.
     *
     * @param {string} groupId Group id.
     * @param {HTMLButtonElement} button The group's button.
     * @param {boolean} [force] Run again a battle that already happened.
     */
    async #runGroup(groupId, button, force = false) {
        button.disabled = true;
        button.textContent = 'Aguardando batalha...';
        await runSimulation({ tournament: groupId, origin: 'tourn', ...(force ? { force: true } : {}) });
        this.refresh();
    }

    /** Updates the teams and groups from the server. */
    async refresh() {
        const data = await TournamentModel.refresh(this.hash, this.round);

        content.querySelectorAll('#group-container .team').forEach(element => {
            const group = element.closest('.group');
            const groupId = this.#groupIds.get(group);
            if (group.classList.contains('hide-info') || !this.#revealed.has(groupId)) return;

            const team = data.teams[this.#teamIds.get(element)];
            const icon = element.querySelector('.icon i');
            icon.className = team.ready ? 'fas fa-check green' : 'far fa-hourglass';
            icon.title = team.ready ? 'A equipe está pronta para a batalha' : 'A equipe ainda não escolheu seu gladiador';
            element.querySelector('.info .glad').className = `glad ${ALIVE_CLASSES[team.alive] ?? ''}`;

            const time = element.querySelector('.info .time');
            if (team.lasttime == null) time.textContent = '-';
            else if (parseFloat(team.lasttime) >= WINNER_TIME) time.innerHTML = winnerIconTemplate;
            else time.textContent = parseFloat(team.lasttime).toFixed(1);
        });

        content.querySelectorAll('#group-container .group').forEach(group => {
            const groupId = this.#groupIds.get(group);
            const state = data.groups[groupId];
            const button = group.querySelector('.foot .button');

            if (state.status === 'DONE') {
                button.disabled = false;
                button.textContent = 'VISUALIZAR BATALHA';
                button.onclick = () => {
                    window.open(`play/${state.hash}`);
                    group.classList.remove('hide-info');
                    this.#revealed.add(groupId);
                    this.refresh();
                };
                if (this.#manager) {
                    button.innerHTML = reloadButtonTemplate;
                    button.querySelector('.reload').addEventListener('click', event => {
                        event.stopPropagation();
                        this.#runGroup(groupId, button, true);
                    });
                }
            }
            else if (state.status === 'RUN') {
                group.classList.add('hide-info');
                button.textContent = 'Grupo pronto. Aguardando batalha...';
                if (group.querySelector('.team.myteam')) this.#lockPrepare(content.querySelector('#prepare'));
                if (this.#manager) {
                    button.textContent = 'Executar Batalha';
                    button.disabled = false;
                    button.onclick = () => this.#runGroup(groupId, button);
                }
            }
            else if (state.status === 'WAIT') {
                const number = button.querySelector('.number');
                if (number) number.textContent = state.value;
                button.classList.toggle('one', state.value == 1);
            }
        });

        const groups = Object.values(data.groups);
        const prepare = content.querySelector('#prepare');
        if (prepare && this.#manager && data.status === 'SUCCESS' && groups.every(group => group.status === 'DONE')) {
            prepare.disabled = false;
            prepare.textContent = 'Preparar próxima rodada';
            prepare.onclick = async () => {
                await TournamentModel.nextRound(this.hash);
                this.refresh();
            };
        }

        if (data.status === 'NEXT' || data.status === 'END') {
            const next = content.querySelector('#next-round');
            next.disabled = false;
            prepare?.remove();
            content.querySelectorAll('#button-container .arrow').forEach(arrow => arrow.classList.add('nobutton'));
            next.onclick = () => {
                location.href = data.status === 'END'
                    ? `tourn/${this.hash}/0`
                    : `tourn/${this.hash}/${parseInt(this.round, 10) + 1}`;
            };
        }
    }
}

new TournamentRound(takeHidden('hash'), takeHidden('round')).show();
