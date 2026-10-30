import { decorateCheckSliders } from '../components/form-controls.js';
import { loadGladCards, loadSelectableCards } from '../components/glad-card.js';
import { showDialog, showInput, showMessage } from '../components/dialog.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { fadeIn, hide, show } from '../helpers/animate.js';
import { TournamentModel } from '../models/tournament.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import {
    addGladTemplate,
    chooseGladTemplate,
    createWindowTemplate,
    createdPrivateTemplate,
    createdPublicTemplate,
    createdTemplate,
    joinWindowTemplate,
    listHeadTemplate,
    listRowTemplate,
    newTeamTemplate,
    teamCreatedTemplate,
    teamRowTemplate,
    teamWindowTemplate,
    teamsHeadTemplate,
    teamsWindowTemplate,
} from '../templates/profile-tournaments.js';

const PAGE_SIZE = 10;
const TEAM_SIZE = 3;

/**
 * Reformats the round time field as digits are typed: "2359" reads "23h 59m",
 * hours capped at 23 and minutes at 59.
 *
 * @param {string} value Current field value.
 * @param {string} key Key pressed.
 * @returns {string} The new value.
 */
export function typeRoundTime(value, key) {
    let digits = [...value].filter(char => char >= '0' && char <= '9').join('').replace(/^0+/, '');
    if (key >= '0' && key <= '9' && digits.length < 4) digits += key;
    else if (key === 'Backspace' || key === 'Delete') digits = digits.slice(0, -1);
    if (!digits) digits = '0';

    let hours = digits.slice(-4, Math.max(0, digits.length - 2));
    let minutes = digits.slice(-2);
    if (parseInt(hours, 10) > 23) hours = '23';
    if (hours.length === 2 && parseInt(minutes, 10) > 59) minutes = '59';
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Whether a round time field holds a valid "HHh MMm".
 *
 * @param {string} value Field value.
 * @returns {boolean}
 */
export function validRoundTime(value) {
    const text = value.includes('h ') ? value : `00h ${value}`;
    const [hours, rest] = text.split('h ');
    return parseInt(rest, 10) <= 59 && parseInt(hours, 10) <= 23;
}

/**
 * Minutes in a round time field ("1h 30m" or "45m").
 *
 * @param {string} value Field value.
 * @returns {number}
 */
export function roundMinutes(value) {
    const text = value.includes('h ') ? value : `00h ${value}`;
    const [hours, rest] = text.split('h ');
    return parseInt(hours, 10) * 60 + parseInt(rest, 10);
}

/** What to tell the master when a team refuses them, by API error code. */
const TEAM_ERRORS = {
    WRONG_WORD: 'Senha incorreta',
    TOURNAMENT_STARTED: 'Este torneio já iniciou',
    ALREADY_IN_TOURNAMENT: 'Você já participa de uma equipe deste torneio',
    TEAM_FULL: 'Esta equipe já está completa',
    SAME_GLADIATOR: 'Este gladiador já faz parte da equipe',
    ALREADY_ENLISTED: 'Neste torneio cada mestre inscreve um gladiador',
};

/**
 * Shows a validation tip above a field.
 *
 * @param {HTMLElement} field Invalid field.
 * @param {string} message Tip.
 */
function showTip(field, message) {
    field.focus();
    field.classList.add('error');
    const tip = document.createElement('span');
    tip.className = 'tip';
    tip.textContent = message;
    field.before(tip);
}

/**
 * Removes the validation tips of a form window.
 *
 * @param {HTMLElement} window_ Form window.
 */
function clearTips(window_) {
    window_.querySelectorAll('.input').forEach(field => field.classList.remove('error'));
    window_.querySelectorAll('.tip').forEach(tip => tip.remove());
}

/**
 * Lets the user pick a gladiator to enter a tournament team.
 *
 * @returns {Promise<{ glad: number, showcode: boolean }|false>}
 */
function chooseGladiator() {
    const fog = createElement(chooseGladTemplate);
    document.body.append(fog);
    decorateCheckSliders(fog);
    const choose = fog.querySelector('#choose');
    const picked = loadSelectableCards(fog.querySelector('.glad-card-container'), choose);
    picked.then(() => fog.querySelectorAll('.glad-preview').forEach(card => {
        card.querySelector('.code')?.remove();
        if (card.classList.contains('old')) card.title = 'Este gladiador precisa ser atualizado';
    }));

    return new Promise(resolve => {
        fog.querySelector('#cancel').addEventListener('click', () => {
            fog.remove();
            resolve(false);
        });
        choose.addEventListener('click', async () => {
            const glad = (await picked)();
            if (!glad) return;
            const showCode = fog.querySelector('#show-code input').checked;
            fog.remove();
            resolve({ gladiator: glad.id, showCode });
        });
    });
}

/**
 * The window of one team: its gladiators, joining or leaving it and adding
 * or removing the user's gladiators.
 */
class TeamWindow {
    /**
     * @param {TournamentWindow} tournament The tournament window behind it.
     * @param {{ id: number, name: string }} team Team.
     */
    constructor(tournament, team) {
        this.tournament = tournament;
        this.team = team;
        this.fog = createElement(renderTemplate(teamWindowTemplate, { name: team.name }));
        hide(tournament.window);
        document.body.append(this.fog);
        this.fog.querySelector('#back').addEventListener('click', () => this.close());
        this.fog.querySelector('#join-leave').addEventListener('click', () => this.#joinOrLeave());
        this.refresh();
    }

    /** Closes the window and goes back to the tournament (refreshed). */
    close() {
        this.fog.remove();
        fadeIn(this.tournament.window);
        this.tournament.refresh();
    }

    /** Draws the team's gladiators. */
    async refresh() {
        const data = await TournamentModel.team(this.team.id);
        const window_ = this.fog.querySelector('.tourn.window');
        this.word = data.word;
        if (data.word) window_.querySelector('#word span').textContent = data.word;
        else window_.querySelector('#word')?.remove();

        // members see the gladiators; others only who brought them
        const known = data.member;
        const glads = known
            ? data.gladiators
            : data.gladiators.map(glad => ({ name: '??????????', vstr: '??', vagi: '??', vint: '??', skin: '', master: glad.master }));

        const container = window_.querySelector('.glad-card-container');
        container.replaceChildren();
        const cards = await loadGladCards(container, { glads, master: true, remove: true });
        cards.forEach((card, index) => {
            const glad = glads[index];
            if (!known) card.classList.add('blurred');
            if (glad.mine === true) {
                card.classList.add('mine');
                card.querySelector('.delete').addEventListener('click', () => this.#askRemove(glad));
            }
            else {
                card.querySelector('.delete-container')?.remove();
            }
        });

        const button = window_.querySelector('#join-leave');
        for (let index = glads.length; index < TEAM_SIZE; index++) {
            const add = createElement(addGladTemplate);
            if (!known || !data.flex) add.classList.add('disabled');
            else add.addEventListener('click', () => this.#addGladiator());
            container.append(add);
        }
        if (!button) return;
        // a refresh after joining turns the button into ABANDONAR again
        button.textContent = known ? 'ABANDONAR' : 'INGRESSAR';
        if (!known && (data.joined || glads.length >= TEAM_SIZE)) {
            button.remove();
            window_.querySelectorAll('#button-container .button').forEach(other => other.classList.add('single'));
        }
    }

    /** The tournament started meanwhile: closes both windows and says so. */
    #tournamentStarted() {
        this.fog.remove();
        this.tournament.fog.remove();
        showMessage('Este torneio já iniciou');
    }

    /** @param {Record<string, any>} glad The user's gladiator in the team. */
    async #askRemove(glad) {
        const answer = await showDialog(`Deseja remover o gladiador <span class='highlight'>${escapeHtml(glad.name)}</span> da equipe?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        let data;
        try {
            data = await TournamentModel.removeGladiator(this.team.id, glad.id);
        }
        catch (error) {
            if (error.code !== 'TOURNAMENT_STARTED') throw error;
            this.#tournamentStarted();
            return;
        }
        if (data.teamRemoved) {
            this.fog.remove();
            await showMessage(`A equipe <span class='highlight'>${escapeHtml(this.team.name)}</span> foi desmantelada`);
            this.close();
        }
        else {
            showMessage(`O gladiador <span class='highlight'>${escapeHtml(glad.name)}</span> foi removido da equipe`);
            this.refresh();
        }
    }

    async #addGladiator() {
        const choice = await chooseGladiator();
        if (!choice) return;
        try {
            await TournamentModel.addGladiator(this.team.id, { word: this.word, ...choice });
        }
        catch (error) {
            if (error.code === 'TOURNAMENT_STARTED') this.#tournamentStarted();
            else showMessage(TEAM_ERRORS[error.code] ?? 'Não foi possível adicionar o gladiador');
            return;
        }
        this.refresh();
    }

    async #joinOrLeave() {
        const button = this.fog.querySelector('#join-leave');
        if (button.textContent === 'ABANDONAR') {
            const answer = await showDialog(`Tem certeza que deseja sair da equipe <span class='highlight'>${escapeHtml(this.team.name)}</span>?`, ['Não', 'SIM']);
            if (answer !== 'SIM') return;
            let data;
            try {
                data = await TournamentModel.leaveTeam(this.team.id);
            }
            catch (error) {
                if (error.code !== 'TOURNAMENT_STARTED') throw error;
                this.#tournamentStarted();
                return;
            }
            this.fog.remove();
            await showMessage(data.teamRemoved
                ? `A equipe <span class='highlight'>${escapeHtml(this.team.name)}</span> foi desmantelada`
                : `Você não faz mais parte da equipe <span class='highlight'>${escapeHtml(this.team.name)}</span>`);
            this.close();
            return;
        }

        const choice = await chooseGladiator();
        if (!choice) return;
        const pass = await showInput('Senha para ingressar na equipe');
        if (pass === false) return;
        try {
            await TournamentModel.joinTeam(this.team.id, { word: pass, ...choice });
        }
        catch (error) {
            showMessage(TEAM_ERRORS[error.code] ?? 'Não foi possível ingressar na equipe');
            return;
        }
        showMessage(`Você ingressou na equipe <span class='highlight'>${escapeHtml(this.team.name)}</span>`);
        this.refresh();
    }
}

/**
 * The window of a tournament that gathers teams: the teams, creating one,
 * and for the manager kicking teams, starting or deleting the tournament.
 */
class TournamentWindow {
    /**
     * @param {HTMLElement} fog The join window's overlay, reused.
     * @param {{ id: number, password: string }} credentials The tournament's id and password (they address it).
     * @param {{ name: string, password: string, description: string }} info The tournament as the server names it.
     */
    constructor(fog, credentials, info) {
        this.fog = fog;
        this.tournament = credentials;
        this.window = fog.querySelector('.tourn.window');
        this.window.innerHTML = renderTemplate(teamsWindowTemplate, { name: info.name, pass: info.password, description: info.description });
        if (!info.password) hide(this.window.querySelector('#word'));

        this.window.querySelector('#close').addEventListener('click', () => this.fog.remove());
        this.window.querySelector('#new').addEventListener('click', () => this.#newTeamField());
        this.refresh();
    }

    /** Draws the teams and the manager's controls. */
    async refresh() {
        const data = await TournamentModel.teams(this.tournament);
        if (data.started) {
            this.fog.remove();
            const answer = await showDialog('Este torneio já iniciou. Deseja acompanhá-lo?', ['Sim', 'Não']);
            if (answer === 'Sim') window.open(`tourn/${data.hash}`);
            return;
        }

        const { teams = [] } = data;
        const joined = data.joined ?? false;
        data.maxteams = data.maxTeams;
        const table = this.window.querySelector('.table');
        const count = this.window.querySelector('h3 #count');
        if (!teams.length) {
            table.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact', icon: 'users', title: 'Nenhuma equipe inscrita', summary: '', actionHtml: '',
            });
            count.textContent = '';
        }
        else {
            table.innerHTML = teamsHeadTemplate + teams.map(team => renderTemplate(teamRowTemplate, {
                state: joined === team.id ? 'signed' : team.gladiators === TEAM_SIZE ? 'full' : '',
                name: team.name,
                glads: team.gladiators,
            })).join('');
            count.textContent = `(${teams.length}/${data.maxteams})`;
            table.querySelectorAll('.row:not(.head)').forEach((row, index) => {
                row.addEventListener('click', () => new TeamWindow(this, teams[index]));
                row.querySelector('.kick').addEventListener('click', event => {
                    event.stopPropagation();
                    this.#askKick(teams[index]);
                });
            });
        }

        this.#managerControls(data, teams);
        this.window.querySelector('#new-container').style.display = joined || teams.length >= data.maxteams ? 'none' : '';
    }

    /**
     * @param {Record<string, any>} data LIST_TEAMS answer.
     * @param {object[]} teams Teams.
     */
    #managerControls(data, teams) {
        const startButton = this.window.querySelector('#start');
        const deleteButton = this.window.querySelector('#delete');

        if (data.manager !== true) {
            this.window.querySelectorAll('.table .row .kick').forEach(kick => kick.remove());
            deleteButton?.remove();
            startButton?.remove();
            this.window.querySelector('#close').classList.add('single');
            return;
        }

        startButton.disabled = !(data.filled === true && teams.length > 1);
        startButton.onclick = () => this.#askStart();
        if (teams.length === 0) {
            deleteButton.hidden = false;
            hide(startButton);
            deleteButton.onclick = () => this.#askDelete();
        }
        else {
            deleteButton.hidden = true;
            show(startButton);
        }
    }

    async #askStart() {
        const answer = await showDialog('Deseja iniciar o torneio? Após o início, as equipes não poderão mais ser alteradas', ['Sim', 'NÃO']);
        if (answer !== 'Sim') return;
        this.fog.remove();
        try {
            const { hash } = await TournamentModel.start(this.tournament);
            window.open(`tourn/${hash}`);
        }
        catch (error) {
            const problems = { FEW_TEAMS: 'O torneio precisa de pelo menos duas equipes', FEW_GLADIATORS: 'Todas as equipes precisam de três gladiadores' };
            if (!problems[error.code]) throw error;
            showMessage(problems[error.code]);
        }
    }

    async #askDelete() {
        const answer = await showDialog('Deseja remover o torneio?', ['Sim', 'NÃO']);
        if (answer !== 'Sim') return;
        try {
            await TournamentModel.remove(this.tournament);
        }
        catch (error) {
            showMessage(error.code === 'TOURNAMENT_STARTED' ? 'Este torneio já iniciou' : 'Um torneio só pode ser removido quando não possuir equipes');
            return;
        }
        showMessage('Torneio removido');
        this.fog.remove();
    }

    /** @param {{ id: number, name: string }} team */
    async #askKick(team) {
        const name = escapeHtml(team.name);
        const answer = await showDialog(`Deseja expulsar a equipe <span class='highlight'>${name}</span> do torneio?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        await TournamentModel.kick(this.tournament, team.id);
        showMessage(`Equipe <span class='highlight'>${name}</span> removida do torneio`);
        this.refresh();
    }

    /** Shows the field that names a new team. */
    #newTeamField() {
        const newButton = this.window.querySelector('#new');
        hide(newButton);
        newButton.insertAdjacentHTML('afterend', newTeamTemplate);
        const group = this.window.querySelector('.input-button');
        const field = group.querySelector('#name');
        field.focus();

        const cancel = () => {
            group.remove();
            this.window.querySelectorAll('.tip').forEach(tip => tip.remove());
            fadeIn(newButton);
        };
        field.addEventListener('keyup', event => {
            if (event.key === 'Enter') group.querySelector('button').click();
            else if (event.key === 'Escape') cancel();
        });
        group.querySelector('button').addEventListener('click', () => this.#createTeam(field.value, group, cancel));
    }

    /**
     * @param {string} name New team's name.
     * @param {HTMLElement} group The name field group.
     * @param {() => void} done Closes the field.
     */
    async #createTeam(name, group, done) {
        this.window.querySelectorAll('.tip').forEach(tip => tip.remove());
        const tip = message => {
            group.querySelector('#name').focus();
            group.insertAdjacentHTML('beforebegin', `<span class='tip'></span>`);
            group.previousElementSibling.textContent = message;
        };
        const names = [...this.window.querySelectorAll('.table .row:not(.head) .cell:first-child')].map(cell => cell.textContent);
        if (name.length < 3) {
            tip('Nome muito curto');
            return;
        }
        if (names.includes(name)) {
            tip('Esta equipe já está registrada');
            return;
        }

        const choice = await chooseGladiator();
        if (!choice) return;
        let data;
        try {
            data = await TournamentModel.createTeam(this.tournament, { name, ...choice });
        }
        catch (error) {
            const messages = {
                TOURNAMENT_NOT_FOUND: 'Torneio não encontrado',
                ALREADY_IN_TOURNAMENT: 'Já está em um time neste torneio',
                TOURNAMENT_FULL: 'Este torneio já esgotou o limite de inscrições',
            };
            if (error.code === 'TOURNAMENT_STARTED') {
                this.fog.remove();
                showMessage('Este torneio já iniciou');
            }
            else if (error.code === 'TEAM_EXISTS') tip('Esta equipe já está registrada');
            else if (messages[error.code]) showMessage(messages[error.code]);
            else throw error;
            return;
        }
        {
            done();
            const box = createElement(renderTemplate(teamCreatedTemplate, { name, word: data.word }));
            document.body.append(box);
            box.querySelector('.button').addEventListener('click', () => {
                box.remove();
                this.refresh();
            });
        }
    }
}

/**
 * The tournament part of the BATALHAS tab: public and own tournament lists,
 * creating and joining tournaments.
 */
export class TournamentsTab {
    #wrapper = document.querySelector('#panel #battle-container #tourn.wrapper');
    #offsets = { mine: 0, open: 0 };

    /** Binds the buttons and the list pages. */
    init() {
        this.#wrapper.querySelector('#create').addEventListener('click', () => this.#openCreate());
        this.#wrapper.querySelector('#join').addEventListener('click', () => this.#openJoin());
        this.#wrapper.querySelectorAll('.title #offset').forEach(pager => {
            const list = pager.classList.contains('mine') ? 'mine' : 'open';
            pager.querySelector('#prev').addEventListener('click', () => this.#page(list, -1));
            pager.querySelector('#next').addEventListener('click', () => this.#page(list, 1));
        });
    }

    /**
     * @param {'mine'|'open'} list Which list.
     * @param {number} direction -1 or 1.
     */
    #page(list, direction) {
        this.#offsets[list] += direction * PAGE_SIZE;
        this.refresh();
    }

    /** Draws both tournament lists. */
    async refresh() {
        const data = await TournamentModel.list(this.#offsets);
        ['mine', 'open'].forEach(list => {
            const { offset, total } = data.pages[list];
            const end = Math.min(total, offset + PAGE_SIZE);
            this.#offsets[list] = offset;

            const pager = this.#wrapper.querySelector(`#offset.${list}`);
            pager.querySelector('.start').textContent = offset + 1;
            pager.querySelector('.end').textContent = end;
            pager.querySelector('.total').textContent = total;
            pager.querySelector('#prev').disabled = offset === 0;
            pager.querySelector('#next').disabled = end === total;
        });

        this.#drawList(this.#wrapper.querySelector('#table-open'), data.open);
        const mine = this.#wrapper.querySelector('#mytourn.title');
        mine.style.display = data.mine.length ? '' : 'none';
        if (data.mine.length) this.#drawList(this.#wrapper.querySelector('#table-mytourn'), data.mine);
    }

    /**
     * @param {HTMLElement} table List table.
     * @param {object[]} tournaments Tournaments.
     */
    #drawList(table, tournaments) {
        table.innerHTML = listHeadTemplate + tournaments.map(tournament => renderTemplate(listRowTemplate, {
            name: tournament.name,
            description: tournament.description,
            teams: tournament.teams,
            maxteams: tournament.maxTeams,
            flex: tournament.flex ? "<i class='fas fa-check flex'></i>" : '',
        })).join('');
        table.querySelectorAll('.row:not(.head)').forEach((row, index) => {
            row.addEventListener('click', async () => {
                const tournament = await TournamentModel.find(tournaments[index].name);
                this.#openJoin({ name: tournament.name, pass: tournament.password, submit: true });
            });
        });
    }

    #openCreate() {
        const fog = createElement(createWindowTemplate);
        document.body.append(fog);
        decorateCheckSliders(fog);
        const window_ = fog.querySelector('.tourn.window');
        fadeIn(window_);
        const field = selector => window_.querySelector(selector);
        field('#name').focus();

        field('#cancel').addEventListener('click', () => fog.remove());
        field('#maxtime .input').addEventListener('keydown', event => {
            if (event.key === 'Tab') return;
            event.preventDefault();
            event.currentTarget.value = typeRoundTime(event.currentTarget.value, event.key);
        });
        field('#public .checkslider').addEventListener('change', event => {
            clearTips(window_);
            const pass = field('#pass');
            if (event.currentTarget.checked) {
                pass.value = '';
                pass.style.height = '0';
                pass.style.opacity = '0';
            }
            else {
                pass.removeAttribute('style');
            }
        });
        field('#create').addEventListener('click', () => this.#create(fog, window_));
    }

    /**
     * Validates and registers a new tournament.
     *
     * @param {HTMLElement} fog Overlay.
     * @param {HTMLElement} window_ Form window.
     */
    async #create(fog, window_) {
        const field = selector => window_.querySelector(selector);
        const name = field('#name').value;
        const pass = field('#pass').value;
        const maxteams = field('#maxteams input').value;
        const maxtime = field('#maxtime input').value;
        const isPublic = field('#public input').checked;

        clearTips(window_);
        if (name.length < 6) return showTip(field('#name'), 'O identificador precisa ter tamanho 6 ou mais');
        if (/[^\w\s]/.test(name)) return showTip(field('#name'), 'O identificador precisa conter somente letras, números ou espaços');
        if (!isPublic && !pass) return showTip(field('#pass'), 'Digite uma senha, ou torne o torneio público');
        if (/\D/.test(maxteams) || maxteams < 2 || maxteams > 50) return showTip(field('#maxteams input'), 'Informe um número entre 2 e 50');
        if (!validRoundTime(maxtime)) return showTip(field('#maxtime input'), 'Formato de hora inválida');

        try {
            await TournamentModel.create({
                name,
                password: pass,
                description: field('#desc').value,
                maxTeams: Number(maxteams),
                maxMinutes: roundMinutes(maxtime),
                flex: field('#flex-team input').checked,
            });
        }
        catch (error) {
            if (error.code !== 'TOURNAMENT_EXISTS') throw error;
            return showTip(field('#name'), 'Um torneio com este identificador já existe');
        }

        fog.remove();
        const content = pass
            ? renderTemplate(createdPrivateTemplate, { name, pass })
            : renderTemplate(createdPublicTemplate, { name });
        const box = createElement(renderTemplate(createdTemplate, { content }));
        document.body.append(box);
        box.querySelector('.button').addEventListener('click', () => box.remove());
        this.refresh();
        return undefined;
    }

    /**
     * Opens the join window, optionally filled and submitted.
     *
     * @param {{ name?: string, pass?: string, submit?: boolean }} [prefill]
     */
    #openJoin({ name = '', pass = '', submit = false } = {}) {
        const fog = createElement(joinWindowTemplate);
        document.body.append(fog);
        const window_ = fog.querySelector('.tourn.window');
        const nameField = window_.querySelector('#name');
        const passField = window_.querySelector('#pass');
        nameField.value = name ?? '';
        passField.value = pass ?? '';
        nameField.focus();

        const join = () => this.#join(fog, nameField.value, passField.value);
        window_.querySelector('#cancel').addEventListener('click', () => fog.remove());
        window_.querySelector('#join').addEventListener('click', join);
        [nameField, passField].forEach(input => input.addEventListener('keyup', event => {
            if (event.key === 'Enter') join();
            if (event.key === 'Escape') fog.remove();
        }));
        if (submit) join();
    }

    /**
     * @param {HTMLElement} fog Join window overlay.
     * @param {string} name Tournament name.
     * @param {string} pass Password.
     */
    async #join(fog, name, pass) {
        const window_ = fog.querySelector('.tourn.window');
        let tournament;
        try {
            tournament = await TournamentModel.find(name, pass);
        }
        catch (error) {
            if (error.code !== 'TOURNAMENT_NOT_FOUND') throw error;
            clearTips(window_);
            ['#name', '#pass'].forEach(selector => window_.querySelector(selector).classList.add('error'));
            showTip(window_.querySelector('#name'), 'Torneio não encontrado');
            return;
        }
        if (tournament.hash) {
            fog.remove();
            window.open(`tourn/${tournament.hash}`);
        }
        else {
            new TournamentWindow(fog, { id: tournament.id, password: tournament.password }, tournament);
        }
    }
}
