import { randomBytes } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { logsDir } from './battle-log.js';
import { TEAM_SIZE } from './tournament.js';

/** Marks the tournaments the dev tools created, the only ones they delete. */
export const TEST_MARKER = '[DEV-TEST]';
/** Version of the export file format. */
const EXPORT_VERSION = '1.1';
/** Columns copied from an export for each table. */
const GLADIATOR_COLUMNS = ['cod', 'master', 'name', 'vstr', 'vagi', 'vint', 'lvl', 'xp', 'skin', 'code', 'blocks', 'mmr', 'version'];

/** `HH:MM:SS`, the format of a tournament's round time. */
const ROUND_TIME = /^\d{2,3}:\d{2}:\d{2}$/;

/**
 * Tournament tooling for administrators (the dev tools page and `scripts/dev-tournament.js`):
 * test tournaments filled with random gladiators, resetting a started tournament to a round, and
 * exporting or importing a tournament with its teams, rounds and battle logs.
 */
export class DevTournament {
    /**
     * A tournament by id, or by its public hash.
     *
     * @param {number|string} ref
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<Record<string, any>>}
     * @throws {CustomError} 404 `TOURNAMENT_NOT_FOUND`.
     */
    static async find(ref, context = {}) {
        const byId = /^\d+$/.test(String(ref));
        const [tournament] = await Mysql.select(`SELECT * FROM tournament WHERE ${byId ? 'id' : 'hash'} = ?`, [byId ? Number(ref) : String(ref)], context);
        if (!tournament) throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');
        return tournament;
    }

    /**
     * @param {boolean} test The test tournaments, or every other one.
     * @param {{ limit?: number, offset?: number }} [page]
     * @returns {Promise<object[]>}
     */
    static async #summaries(test, { limit = 1000, offset = 0 } = {}) {
        const rows = await Mysql.select(
            `SELECT t.id, t.name, t.description, t.creation, t.hash, t.maxteams, u.apelido AS manager,
                (SELECT COUNT(*) FROM teams te WHERE te.tournament = t.id) AS teams,
                (SELECT COUNT(*) FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id WHERE te.tournament = t.id) AS gladiators,
                (SELECT MAX(gr.round) FROM \`groups\` gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team WHERE te.tournament = t.id) AS maxRound
            FROM tournament t INNER JOIN usuarios u ON u.id = t.manager
            WHERE t.description ${test ? '' : 'NOT '}LIKE ? ORDER BY t.creation DESC, t.id DESC LIMIT ? OFFSET ?`,
            [Mysql.contains(TEST_MARKER), limit, offset],
        );
        return rows.map(row => ({
            id: row.id, name: row.name, description: row.description, manager: row.manager, createdAt: row.creation,
            hash: row.hash || null, started: Boolean(row.hash), teams: Number(row.teams), maxTeams: row.maxteams,
            gladiators: Number(row.gladiators), maxRound: row.maxRound ?? 0,
        }));
    }

    /** @returns {Promise<object[]>} The test tournaments, newest first. */
    static listTest() {
        return DevTournament.#summaries(true);
    }

    /**
     * A page of the real tournaments, newest first.
     *
     * @param {{ page: number, limit: number }} page
     * @returns {Promise<{ tournaments: object[], pagination: { page: number, limit: number, total: number, totalPages: number } }>}
     */
    static async listReal({ page, limit }) {
        const [{ total }] = await Mysql.select('SELECT COUNT(*) AS total FROM tournament WHERE description NOT LIKE ?', [Mysql.contains(TEST_MARKER)]);
        const tournaments = await DevTournament.#summaries(false, { limit, offset: (page - 1) * limit });
        return { tournaments, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } };
    }

    /**
     * Creates a public test tournament of `teams` full teams of random gladiators (none of the
     * manager's), not started.
     *
     * @param {{ name: string, teams: number, maxTime: string, managerId: number, managerEmail?: string }} options
     *   The manager is the master with `managerEmail`, else `managerId`.
     * @returns {Promise<{ id: number, name: string, manager: string, teams: Array<{ id: number, name: string, gladiators: Array<{ name: string, master: string }> }> }>}
     * @throws {CustomError} 404 `MANAGER_NOT_FOUND`, 409 `TOURNAMENT_EXISTS`/`FEW_GLADIATORS`.
     */
    static async bootstrap({ name, teams, maxTime, managerId, managerEmail }) {
        if (!ROUND_TIME.test(maxTime)) throw new CustomError(400, 'Use HH:MM:SS for the round time.', 'INVALID_MAX_TIME');
        return Mysql.withTransaction(async context => {
            const filter = managerEmail ? { email: managerEmail } : { id: managerId };
            const manager = await Mysql.findOne('usuarios', { filter, view: ['id', 'apelido'] }, context);
            if (!manager) throw new CustomError(404, 'Manager not found.', 'MANAGER_NOT_FOUND');
            if (await Mysql.count('tournament', { name }, context)) throw new CustomError(409, 'A tournament with this name exists.', 'TOURNAMENT_EXISTS');

            const needed = teams * TEAM_SIZE;
            const gladiators = await Mysql.select(
                'SELECT g.cod, g.name, u.apelido FROM gladiators g INNER JOIN usuarios u ON u.id = g.master WHERE g.master != ? ORDER BY RAND() LIMIT ?',
                [manager.id, needed],
                context,
            );
            if (gladiators.length < needed) throw new CustomError(409, `Not enough gladiators: ${needed} needed.`, 'FEW_GLADIATORS');

            const { insertId: id } = await Mysql.insert('tournament', {
                manager: manager.id, name, password: '', hash: '', maxteams: teams, flex: 1, maxtime: maxTime,
                description: `${TEST_MARKER} Created by the dev tools`, creation: Mysql.raw('NOW()'),
            }, context);
            const created = [];
            for (let index = 0; index < teams; index++) {
                const teamName = `Team ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
                const { insertId: teamId } = await Mysql.insert('teams', { name: teamName, password: 'test', tournament: id, modified: Mysql.raw('NOW()') }, context);
                const members = gladiators.slice(index * TEAM_SIZE, (index + 1) * TEAM_SIZE);
                await Mysql.insert('gladiator_teams', members.map(glad => ({ gladiator: glad.cod, team: teamId, visible: 1 })), context);
                created.push({ id: teamId, name: teamName, gladiators: members.map(glad => ({ name: glad.name, master: glad.apelido })) });
            }
            return { id, name, manager: manager.apelido, teams: created };
        });
    }

    /**
     * The groups of a tournament's rounds, from `round` on.
     *
     * @param {number} tournamentId
     * @param {number} fromRound
     * @param {{ connection: unknown }} context
     * @returns {Promise<Array<{ id: number, round: number, log: number|null }>>}
     */
    static #groups(tournamentId, fromRound, context) {
        return Mysql.select(
            `SELECT DISTINCT gr.id, gr.round, gr.log FROM \`groups\` gr INNER JOIN group_teams grt ON grt.groupid = gr.id
            INNER JOIN teams te ON te.id = grt.team WHERE te.tournament = ? AND gr.round >= ?`,
            [tournamentId, fromRound],
            context,
        );
    }

    /**
     * Deletes the battle log rows no group or report points at any more (an imported copy of a
     * tournament shares its logs); their files go after the transaction commits
     * ({@link DevTournament.#removeLogFiles}).
     *
     * @param {number[]} logIds Logs of groups already deleted or cleared.
     * @param {{ connection: unknown }} context
     * @returns {Promise<number[]>} The logs deleted.
     */
    static async #deleteLogs(logIds, context) {
        if (!logIds.length) return [];
        const kept = await Mysql.select(
            'SELECT log FROM `groups` WHERE log IN (?) UNION SELECT log FROM training_groups WHERE log IN (?) UNION SELECT log FROM reports WHERE log IN (?)',
            [logIds, logIds, logIds],
            context,
        );
        const used = new Set(kept.map(row => row.log));
        const unused = [...new Set(logIds)].filter(id => !used.has(id));
        if (unused.length) await Mysql.delete('logs', { id: unused }, context);
        return unused;
    }

    /** @param {number[]} logIds */
    static async #removeLogFiles(logIds) {
        await Promise.all(logIds.map(id => rm(path.join(logsDir(), String(id)), { force: true })));
    }

    /**
     * Deletes a tournament with its teams, rounds and battle logs.
     *
     * @param {number} tournamentId
     * @param {{ connection: unknown }} context
     * @returns {Promise<{ logs: number[], stats: Record<string, number> }>}
     */
    static async #purge(tournamentId, context) {
        const groups = await DevTournament.#groups(tournamentId, 0, context);
        const groupIds = groups.map(group => group.id);
        if (groupIds.length) {
            await Mysql.delete('group_teams', { groupid: groupIds }, context);
            await Mysql.delete('groups', { id: groupIds }, context);
        }
        const logs = await DevTournament.#deleteLogs(groups.map(group => group.log).filter(Boolean), context);
        const stats = { groups: groupIds.length, logs: logs.length, teams: 0, gladiators: 0 };
        const teams = await Mysql.select('SELECT id FROM teams WHERE tournament = ?', [tournamentId], context);
        if (teams.length) {
            stats.gladiators = await Mysql.delete('gladiator_teams', { team: teams.map(team => team.id) }, context);
            stats.teams = await Mysql.delete('teams', { tournament: tournamentId }, context);
        }
        return { logs, stats };
    }

    /**
     * Deletes a test tournament with everything it holds. Real tournaments are refused.
     *
     * @param {number} id
     * @returns {Promise<{ name: string, stats: Record<string, number> }>}
     * @throws {CustomError} 404 `TOURNAMENT_NOT_FOUND`, 409 `NOT_A_TEST_TOURNAMENT`.
     */
    static async remove(id) {
        const { name, logs, stats } = await Mysql.withTransaction(async context => {
            const tournament = await DevTournament.find(id, context);
            if (!String(tournament.description ?? '').includes(TEST_MARKER)) {
                throw new CustomError(409, 'Only test tournaments can be deleted here.', 'NOT_A_TEST_TOURNAMENT');
            }
            const purged = await DevTournament.#purge(tournament.id, context);
            await Mysql.delete('tournament', { id: tournament.id }, context);
            return { name: tournament.name, ...purged };
        });
        await DevTournament.#removeLogFiles(logs);
        return { name, stats };
    }

    /**
     * Deletes every test tournament.
     *
     * @returns {Promise<Array<{ id: number, name: string, stats: Record<string, number> }>>}
     */
    static async removeAllTest() {
        const deleted = [];
        for (const tournament of await DevTournament.listTest()) {
            deleted.push({ id: tournament.id, ...await DevTournament.remove(tournament.id) });
        }
        return deleted;
    }

    /**
     * Takes a started tournament back to the start of a round: later rounds and their logs are
     * deleted, gladiators killed from that round on come back, the round's battles and choices are
     * cleared and its choosing time starts again.
     *
     * @param {number|string} ref Tournament id or hash.
     * @param {number} round
     * @returns {Promise<{ id: number, name: string, hash: string, round: number, maxRound: number, stats: Record<string, number> }>}
     * @throws {CustomError} 404, 409 `TOURNAMENT_NOT_STARTED`/`ROUND_NOT_FOUND`.
     */
    static async reset(ref, round) {
        const result = await Mysql.withTransaction(async context => {
            const tournament = await DevTournament.find(ref, context);
            if (!tournament.hash) throw new CustomError(409, 'The tournament has not started.', 'TOURNAMENT_NOT_STARTED');
            const groups = await DevTournament.#groups(tournament.id, round, context);
            const [{ maxRound }] = await Mysql.select(
                `SELECT MAX(gr.round) AS maxRound FROM \`groups\` gr INNER JOIN group_teams grt ON grt.groupid = gr.id
                INNER JOIN teams te ON te.id = grt.team WHERE te.tournament = ?`,
                [tournament.id],
                context,
            );
            if (!groups.some(group => group.round === round)) throw new CustomError(409, `Round ${round} does not exist.`, 'ROUND_NOT_FOUND');

            const later = groups.filter(group => group.round > round).map(group => group.id);
            const current = groups.filter(group => group.round === round).map(group => group.id);
            if (later.length) {
                await Mysql.delete('group_teams', { groupid: later }, context);
                await Mysql.delete('groups', { id: later }, context);
            }
            // the round time is a TIME column, checked before it is embedded
            const maxTime = ROUND_TIME.test(String(tournament.maxtime)) ? tournament.maxtime : '00:10:00';
            await Mysql.update('groups', { log: null, locked: null, deadline: Mysql.raw(`ADDTIME(NOW(), '${maxTime}')`) }, { id: current }, context);
            await Mysql.update('group_teams', { gladiator: null, lasttime: null }, { groupid: current }, context);
            const logs = await DevTournament.#deleteLogs(groups.map(group => group.log).filter(Boolean), context);
            const teams = await Mysql.select('SELECT id FROM teams WHERE tournament = ?', [tournament.id], context);
            const revived = await Mysql.update('gladiator_teams', { dead: 0 }, { team: teams.map(team => team.id), dead: { '>=': round } }, context);
            return {
                id: tournament.id, name: tournament.name, hash: tournament.hash, round, maxRound,
                logs, stats: { roundsRemoved: maxRound - round, groupsDeleted: later.length, logsDeleted: logs.length, revived: Number(revived) },
            };
        });
        const { logs, ...summary } = result;
        await DevTournament.#removeLogFiles(logs);
        return summary;
    }

    /**
     * Everything a tournament holds, to import elsewhere: its rows, the gladiators' rows, the battle
     * logs with their files, and the masters' nicks (no other user data).
     *
     * @param {number|string} ref Tournament id or hash.
     * @returns {Promise<Record<string, any>>}
     */
    static async export(ref) {
        const tournament = await DevTournament.find(ref);
        const teams = await Mysql.select('SELECT * FROM teams WHERE tournament = ? ORDER BY id', [tournament.id]);
        const teamIds = teams.map(team => team.id);
        const inTeams = teamIds.length ? teamIds : [0];
        const gladiatorTeams = await Mysql.select('SELECT * FROM gladiator_teams WHERE team IN (?) ORDER BY id', [inTeams]);
        const groupTeams = await Mysql.select('SELECT * FROM group_teams WHERE team IN (?) ORDER BY id', [inTeams]);
        const groupIds = [...new Set(groupTeams.map(row => row.groupid))];
        const groups = groupIds.length ? await Mysql.select('SELECT * FROM `groups` WHERE id IN (?) ORDER BY id', [groupIds]) : [];
        const gladiatorIds = [...new Set(gladiatorTeams.map(row => row.gladiator).filter(Boolean))];
        const gladiators = gladiatorIds.length ? await Mysql.select('SELECT * FROM gladiators WHERE cod IN (?)', [gladiatorIds]) : [];
        const logIds = [...new Set(groups.map(group => group.log).filter(Boolean))];
        const logs = logIds.length ? await Mysql.select('SELECT * FROM logs WHERE id IN (?)', [logIds]) : [];
        for (const log of logs) {
            log.file_content = await readFile(path.join(logsDir(), String(log.id)), 'utf8').catch(() => null);
        }
        const userIds = [...new Set([tournament.manager, ...gladiators.map(glad => glad.master)].filter(Boolean))];
        const users = await Mysql.select('SELECT id, apelido FROM usuarios WHERE id IN (?)', [userIds.length ? userIds : [0]]);

        return {
            export_info: { version: EXPORT_VERSION, exported_at: new Date().toISOString(), tournament_id: tournament.id, tournament_name: tournament.name, tournament_hash: tournament.hash },
            tournaments: [tournament],
            teams,
            gladiator_teams: gladiatorTeams,
            group_teams: groupTeams,
            groups,
            gladiators,
            logs,
            users,
        };
    }

    /**
     * Imports an export: as a new tournament (`create`), or replacing the teams, rounds and logs of
     * an existing one (`update`). Gladiators missing here are created with their ids; battle logs
     * already here (same hash) are reused. Users are not imported: managers and masters must exist.
     *
     * @param {Record<string, any>} data An export.
     * @param {{ mode: 'create'|'update', tournamentId?: number }} options
     * @returns {Promise<{ id: number, name: string, mode: string, summary: string[] }>}
     * @throws {CustomError} 400 `INVALID_EXPORT`, 404, 409 `TOURNAMENT_EXISTS`.
     */
    static async import(data, { mode, tournamentId }) {
        const source = data?.tournaments?.[0];
        if (!source || !Array.isArray(data.teams)) throw new CustomError(400, 'This is not a tournament export.', 'INVALID_EXPORT');
        const list = key => (Array.isArray(data[key]) ? data[key] : []);
        /** Log files written for new rows, and the logs an update replaced. */
        const written = [];
        const replaced = [];

        let result;
        try {
            result = await Mysql.withTransaction(async context => {
                const summary = [];
                const fields = {
                    name: source.name, password: source.password ?? '', description: source.description ?? '', creation: source.creation ?? null,
                    maxteams: source.maxteams, flex: source.flex, manager: source.manager, maxtime: source.maxtime,
                };
                let id = tournamentId;
                if (mode === 'update') {
                    const tournament = await DevTournament.find(tournamentId, context);
                    const { logs, stats } = await DevTournament.#purge(tournament.id, context);
                    replaced.push(...logs);
                    // the same guard as creating: never take a hash another tournament answers for
                    const taken = source.hash && await Mysql.count('tournament', { hash: source.hash, id: { not: tournament.id } }, context);
                    const hash = taken ? randomBytes(8).toString('hex') : source.hash ?? '';
                    await Mysql.update('tournament', { ...fields, hash }, { id: tournament.id }, context);
                    if (taken) summary.push(`The hash ${source.hash} belongs to another tournament: this one now uses ${hash}`);
                    summary.push(`Tournament ${id} updated: ${stats.teams} teams, ${stats.groups} groups and ${stats.logs} logs replaced`);
                }
                else {
                    if (await Mysql.count('tournament', { name: source.name }, context)) {
                        throw new CustomError(409, 'A tournament with this name exists.', 'TOURNAMENT_EXISTS');
                    }
                    // a second tournament with the same hash would answer for the first one's rounds
                    const hash = source.hash && !await Mysql.count('tournament', { hash: source.hash }, context) ? source.hash : (source.hash ? randomBytes(8).toString('hex') : '');
                    ({ insertId: id } = await Mysql.insert('tournament', { ...fields, hash }, context));
                    summary.push(`Tournament created with id ${id}${hash !== (source.hash ?? '') ? ` and the new hash ${hash}` : ''}`);
                }

                const teamIds = new Map();
                for (const team of data.teams) {
                    const { insertId } = await Mysql.insert('teams', { tournament: id, name: team.name, password: team.password, modified: team.modified ?? null }, context);
                    teamIds.set(team.id, insertId);
                }
                summary.push(`Imported ${teamIds.size} teams`);

                let createdGladiators = 0;
                for (const glad of list('gladiators')) {
                    if (await Mysql.count('gladiators', { cod: glad.cod }, context)) continue;
                    await Mysql.insert('gladiators', Object.fromEntries(GLADIATOR_COLUMNS.map(column => [column, glad[column] ?? null])), context);
                    createdGladiators++;
                }
                summary.push(`Processed ${list('gladiators').length} gladiators (${createdGladiators} created)`);

                const members = list('gladiator_teams').filter(row => teamIds.has(row.team));
                for (const row of members) {
                    await Mysql.insert('gladiator_teams', { team: teamIds.get(row.team), gladiator: row.gladiator, visible: row.visible ?? 1, dead: row.dead ?? 0 }, context);
                }
                summary.push(`Created ${members.length} gladiator-team links`);

                const logIds = new Map();
                for (const log of list('logs')) {
                    const [existing] = await Mysql.select('SELECT id, origin FROM logs WHERE hash = ? LIMIT 1', [log.hash], context);
                    // reuse only another tournament's log: never tie a group to a ranked or duel battle
                    // that deleting this tournament could then remove
                    if (existing?.origin === 'tourn') {
                        logIds.set(log.id, existing.id);
                        continue;
                    }
                    const hash = existing ? randomBytes(8).toString('hex') : log.hash;
                    const { insertId } = await Mysql.insert('logs', { hash, time: log.time ?? null, version: log.version ?? null, origin: 'tourn' }, context);
                    logIds.set(log.id, insertId);
                    if (typeof log.file_content === 'string') {
                        await writeFile(path.join(logsDir(), String(insertId)), log.file_content);
                        written.push(insertId);
                    }
                }
                summary.push(`Imported ${list('logs').length} logs (${written.length} files written)`);

                const groupIds = new Map();
                for (const group of list('groups')) {
                    const { insertId } = await Mysql.insert('groups', {
                        round: group.round, log: logIds.get(group.log) ?? null, deadline: group.deadline ?? null, locked: null,
                    }, context);
                    groupIds.set(group.id, insertId);
                }
                summary.push(`Created ${groupIds.size} groups`);

                const imported = new Set(members.map(row => row.gladiator));
                const entries = list('group_teams').filter(row => groupIds.has(row.groupid) && teamIds.has(row.team));
                for (const row of entries) {
                    await Mysql.insert('group_teams', {
                        groupid: groupIds.get(row.groupid), team: teamIds.get(row.team),
                        gladiator: imported.has(row.gladiator) ? row.gladiator : null, lasttime: row.lasttime ?? null,
                    }, context);
                }
                summary.push(`Created ${entries.length} group-team links`);
                return { id, name: source.name, mode, summary };
            });
        }
        catch (error) {
            // the rows rolled back, so the files written for them go too
            await DevTournament.#removeLogFiles(written);
            throw error;
        }
        // the replaced logs' rows are gone for good now
        await DevTournament.#removeLogFiles(replaced);
        return result;
    }
}
