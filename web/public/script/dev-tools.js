import { showDialog, showInput, showMessage } from './components/dialog.js';
import { createToast } from './components/toast.js';
import { copyText } from './helpers/clipboard.js';
import { createElement, escapeHtml, renderTemplate } from './helpers/html.js';
import { DevToolsModel } from './models/dev-tools.js';
import {
    createdTemplate,
    emptyListTemplate,
    errorTemplate,
    exportButtonTemplate,
    hashItemTemplate,
    importedTemplate,
    removeButtonTemplate,
    resetButtonTemplate,
    summaryItemTemplate,
    tournamentCardTemplate,
    viewLinkTemplate,
} from './templates/dev-tools.js';

/** Real tournaments per page. */
const REAL_PAGE_SIZE = 6;

const $ = selector => document.querySelector(selector);

/**
 * @param {string|null} value A MySQL date (`YYYY-MM-DD HH:MM:SS`).
 * @returns {string}
 */
function formatDate(value) {
    if (!value) return 'recently';
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * Shows a box's result, or hides the box.
 *
 * @param {HTMLElement} box A `.result-box`.
 * @param {string|null} markup
 * @param {'success'|'error'} [kind]
 */
function showResult(box, markup, kind = 'success') {
    box.style.display = markup ? 'block' : 'none';
    box.className = `result-box ${kind}`;
    box.innerHTML = markup ?? '';
}

/**
 * Shows or hides a loading block.
 *
 * @param {HTMLElement} element
 * @param {boolean} visible
 */
function loading(element, visible) {
    element.style.display = visible ? 'block' : 'none';
}

/**
 * Saves an export as a JSON file.
 *
 * @param {Record<string, any>} data
 */
function download(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tournament_${data.export_info.tournament_id}_export_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * The dev tools page: test tournaments (create, reset, export, delete), the real tournaments
 * (reset, export) and moving tournaments between databases through JSON exports.
 */
class DevCockpit {
    #realPage = 1;

    /** Binds the page and loads both lists; anyone but an administrator is sent home. */
    async init() {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.addEventListener('click', () => this.#openTab(tab)));
        $('#toggleCreatePanel').addEventListener('click', () => {
            const card = $('#createSection');
            card.classList.toggle('open');
            if (card.classList.contains('open')) $('#name').focus();
        });
        $('#createForm').addEventListener('submit', event => this.#create(event));
        $('#refreshTestTournaments').addEventListener('click', () => this.loadTest());
        $('#refreshRealTournaments').addEventListener('click', () => this.loadReal(this.#realPage));
        $('#realPrevPage').addEventListener('click', () => this.loadReal(this.#realPage - 1));
        $('#realNextPage').addEventListener('click', () => this.loadReal(this.#realPage + 1));
        $('#exportType').addEventListener('change', () => this.#toggleExportFields());
        $('#exportForm').addEventListener('submit', event => this.#exportForm(event));
        $('#importMode').addEventListener('change', () => this.#toggleImportMode());
        $('#importFile').addEventListener('change', () => {
            const file = $('#importFile').files[0];
            if (!file) return;
            const name = $('#fileNameDisplay');
            name.textContent = file.name;
            name.classList.add('chosen');
        });
        $('#importForm').addEventListener('submit', event => this.#import(event));

        try {
            await this.loadTest();
        }
        catch (error) {
            if (error.code !== 'ADMIN_ONLY' && error.code !== 'NOT_SIGNED_IN') throw error;
            await showMessage('Only administrators can open the dev tools.');
            location.href = '/';
            return;
        }
        this.loadReal(1);
    }

    /** @param {HTMLElement} tab */
    #openTab(tab) {
        document.querySelectorAll('.nav-tab').forEach(other => other.classList.toggle('active', other === tab));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === tab.dataset.tab));
    }

    /**
     * A tournament's card with its actions bound to it.
     *
     * @param {Record<string, any>} tournament
     * @param {boolean} production A real tournament: no delete, a stronger reset warning.
     * @returns {HTMLElement}
     */
    #card(tournament, production) {
        const actions = [];
        if (tournament.started) {
            actions.push(renderTemplate(resetButtonTemplate, { style: production ? 'btn-danger' : 'btn-secondary' }));
            actions.push(renderTemplate(viewLinkTemplate, { hash: tournament.hash }));
        }
        actions.push(exportButtonTemplate);
        if (!production) actions.push(removeButtonTemplate);

        const card = createElement(renderTemplate(tournamentCardTemplate, {
            name: tournament.name,
            created: formatDate(tournament.createdAt),
            badgeClass: tournament.started ? 'started' : 'not-started',
            badge: tournament.started ? 'Started' : 'Not Started',
            id: tournament.id,
            teams: tournament.teams,
            maxTeams: tournament.maxTeams,
            gladiators: tournament.gladiators,
            round: tournament.maxRound || '-',
            manager: tournament.manager,
            hashItem: tournament.hash ? renderTemplate(hashItemTemplate, { hash: tournament.hash }) : '',
            actions: actions.join(''),
        }));
        card.querySelector('.copy')?.addEventListener('click', async () => {
            await copyText(tournament.hash);
            createToast('Hash copied', 'success');
        });
        card.querySelector('.reset')?.addEventListener('click', () => this.#reset(tournament, production));
        card.querySelector('.export').addEventListener('click', () => this.#export(tournament.id));
        card.querySelector('.remove')?.addEventListener('click', () => this.#remove(tournament));
        return card;
    }

    /**
     * Lists tournaments in a grid, or says there are none.
     *
     * @param {HTMLElement} list
     * @param {object[]} tournaments
     * @param {boolean} production
     */
    #fill(list, tournaments, production) {
        if (!tournaments.length) {
            list.innerHTML = renderTemplate(emptyListTemplate, production
                ? { title: 'No production tournaments found', hint: '' }
                : { title: 'No test tournaments found', hint: 'Click "Bootstrap New" to create one.' });
            return;
        }
        list.replaceChildren(...tournaments.map(tournament => this.#card(tournament, production)));
    }

    /** Loads the test tournaments. Admin refusals propagate to {@link DevCockpit.init}. */
    async loadTest() {
        const list = $('#tournamentList');
        const spin = $('#refreshTestTournaments svg');
        list.replaceChildren();
        loading($('#listLoading'), true);
        spin?.classList.add('icon-spin');
        try {
            this.#fill(list, await DevToolsModel.testTournaments(), false);
        }
        finally {
            loading($('#listLoading'), false);
            spin?.classList.remove('icon-spin');
        }
    }

    /**
     * Loads a page of the real tournaments.
     *
     * @param {number} page
     */
    async loadReal(page) {
        const list = $('#realTournamentList');
        const spin = $('#refreshRealTournaments svg');
        list.replaceChildren();
        $('#realPagination').style.display = 'none';
        loading($('#realListLoading'), true);
        spin?.classList.add('icon-spin');
        try {
            const { tournaments, pagination } = await DevToolsModel.tournaments({ page: Math.max(1, page), limit: REAL_PAGE_SIZE });
            this.#realPage = pagination.page;
            this.#fill(list, tournaments, true);
            if (pagination.totalPages > 1) {
                $('#realPagination').style.display = 'flex';
                $('#realPageInfo').textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
                $('#realPrevPage').disabled = pagination.page <= 1;
                $('#realNextPage').disabled = pagination.page >= pagination.totalPages;
            }
        }
        finally {
            loading($('#realListLoading'), false);
            spin?.classList.remove('icon-spin');
        }
    }

    /** @param {SubmitEvent} event */
    async #create(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const box = $('#createResult');
        showResult(box, null);
        loading($('#createLoading'), true);
        try {
            const created = await DevToolsModel.createTest({
                name: String(form.get('name')),
                teams: Number(form.get('teams')),
                maxTime: String(form.get('maxtime')),
                managerEmail: String(form.get('manager') || '') || undefined,
            });
            showResult(box, renderTemplate(createdTemplate, {
                name: created.name, id: created.id, teams: created.teams.length,
                gladiators: created.teams.reduce((sum, team) => sum + team.gladiators.length, 0), manager: created.manager,
            }));
            createToast('Test tournament created', 'success');
            this.loadTest();
        }
        catch (error) {
            showResult(box, renderTemplate(errorTemplate, { title: 'Creation failed', message: error.message }), 'error');
        }
        finally {
            loading($('#createLoading'), false);
        }
    }

    /**
     * Takes a started tournament back to a round, after asking which one (and, for a real one,
     * asking again).
     *
     * @param {Record<string, any>} tournament
     * @param {boolean} production
     */
    async #reset(tournament, production) {
        const name = escapeHtml(tournament.name);
        const answer = await showInput(
            `Reset <b>${name}</b> to which round (1 to ${tournament.maxRound})? Later rounds and their battle logs are deleted, their dead gladiators come back and the round's choosing time starts again.`,
            String(production ? tournament.maxRound : 1),
        );
        if (answer === false) return;
        const round = Number(answer);
        if (!Number.isInteger(round) || round < 1 || round > tournament.maxRound) {
            createToast('Choose an existing round', 'error');
            return;
        }
        if (production && await showInput(`<b>${name}</b> is a real tournament. Type YES to reset it to round ${round}.`, '') !== 'YES') {
            createToast('Reset cancelled', 'info');
            return;
        }

        try {
            await DevToolsModel.reset(tournament.id, round);
        }
        catch (error) {
            createToast(escapeHtml(error.message), 'error');
            return;
        }
        createToast(`${escapeHtml(tournament.name)} reset to round ${round}`, 'success');
        if (production) this.loadReal(this.#realPage);
        else this.loadTest();
        if (await showDialog('Open the tournament now?', ['Open', 'Close']) === 'Open') {
            window.open(`tourn/${tournament.hash}/${round}`, '_blank', 'noopener');
        }
    }

    /**
     * Downloads a tournament's export.
     *
     * @param {number|string} ref Tournament id or hash.
     */
    async #export(ref) {
        try {
            download(await DevToolsModel.export(ref));
            createToast('Export downloaded', 'success');
        }
        catch (error) {
            createToast(escapeHtml(error.message), 'error');
        }
    }

    /** @param {Record<string, any>} tournament A test tournament. */
    async #remove(tournament) {
        const question = `Delete the test tournament <b>${escapeHtml(tournament.name)}</b> with its teams, rounds and battle logs?`;
        if (await showDialog(question, ['Delete', 'Cancel']) !== 'Delete') return;
        try {
            await DevToolsModel.removeTest(tournament.id);
        }
        catch (error) {
            createToast(escapeHtml(error.message), 'error');
            return;
        }
        createToast(`${escapeHtml(tournament.name)} deleted`, 'success');
        this.loadTest();
    }

    #toggleExportFields() {
        const byId = $('#exportType').value === 'id';
        $('#exportIdField').style.display = byId ? 'block' : 'none';
        $('#exportHashField').style.display = byId ? 'none' : 'block';
    }

    /** @param {SubmitEvent} event */
    async #exportForm(event) {
        event.preventDefault();
        const ref = ($('#exportType').value === 'id' ? $('#exportId').value : $('#exportHash').value).trim();
        if (!ref) {
            createToast('Enter a tournament id or hash', 'error');
            return;
        }
        await this.#export(ref);
    }

    #toggleImportMode() {
        const update = $('#importMode').value === 'update';
        const help = $('#importModeHelp');
        $('#importTournamentIdField').style.display = update ? 'block' : 'none';
        help.textContent = update ? 'Replaces the teams, rounds and battle logs of an existing tournament' : 'Creates a new tournament';
        help.className = update ? 'text-danger' : 'text-muted';
    }

    /** @param {SubmitEvent} event */
    async #import(event) {
        event.preventDefault();
        const file = $('#importFile').files[0];
        const mode = $('#importMode').value;
        const tournamentId = Number($('#importTournamentId').value) || undefined;
        if (!file) return;
        if (mode === 'update') {
            if (!tournamentId) {
                createToast('Enter the tournament id to replace', 'error');
                return;
            }
            const question = `Replace the teams, rounds and battle logs of tournament #${tournamentId} with the file's?`;
            if (await showDialog(question, ['Replace', 'Cancel']) !== 'Replace') return;
        }

        let data;
        try {
            data = JSON.parse(await file.text());
        }
        catch {
            createToast('The file is not JSON', 'error');
            return;
        }

        const box = $('#importResult');
        showResult(box, null);
        loading($('#importLoading'), true);
        try {
            const result = await DevToolsModel.import({ data, mode, tournamentId });
            showResult(box, renderTemplate(importedTemplate, {
                mode: result.mode.toUpperCase(), id: result.id, name: result.name,
                summary: result.summary.map(text => renderTemplate(summaryItemTemplate, { text })).join(''),
            }));
            createToast('Import done', 'success');
            this.loadTest();
            this.loadReal(this.#realPage);
        }
        catch (error) {
            showResult(box, renderTemplate(errorTemplate, { title: 'Import failed', message: error.message }), 'error');
        }
        finally {
            loading($('#importLoading'), false);
        }
    }
}

new DevCockpit().init();
