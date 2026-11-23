import { randomBytes, randomInt } from 'node:crypto';
import { sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Tournaments per list page. */
export const TOURNAMENTS_PAGE_SIZE = 10;
/** Gladiators a team brings. */
export const TEAM_SIZE = 3;
/** Teams per group of a round. */
export const GROUP_SIZE = 5;
/** Shortest round, in minutes. */
const MIN_ROUND_MINUTES = 3;

/**
 * A team's join word: three consonant-vowel pairs (`bakoti`), as the PHP backend made them.
 *
 * @returns {string}
 */
export function teamWord() {
    const vowels = 'aeiouy';
    const consonants = 'bcdfghjklmnprstvwxz';
    let word = '';
    for (let index = 0; index < 3; index++) word += consonants[randomInt(consonants.length)] + vowels[randomInt(vowels.length)];
    return word;
}

/**
 * Tournaments (`tournament`) while they gather teams (`teams`, `gladiator_teams`), and their start.
 * Before it starts a tournament is reached by name and password (empty for public ones); once
 * started it has a public `hash` and its rounds live in `model/tournament-round.js`.
 */
export class Tournament {
    /**
     * Creates a tournament managed by the master.
     *
     * @param {number} managerId
     * @param {{ name: string, password: string, description: string, maxTeams: number, maxMinutes: number, flex: boolean }} tournament
     * @returns {Promise<number>} The tournament id.
     * @throws {CustomError} 409 `TOURNAMENT_EXISTS`.
     */
    static async create(managerId, { name, password, description, maxTeams, maxMinutes, flex }) {
        if (await Mysql.count('tournament', { name })) throw new CustomError(409, 'A tournament with this name exists.', 'TOURNAMENT_EXISTS');
        const seconds = Math.max(MIN_ROUND_MINUTES, maxMinutes) * 60;
        const { insertId } = await Mysql.insert('tournament', {
            manager: managerId, name, password, description, creation: Mysql.raw('NOW()'), hash: '',
            maxteams: Math.min(50, Math.max(2, maxTeams)), flex: Number(flex), maxtime: Mysql.raw(`SEC_TO_TIME(${Number(seconds)})`),
        });
        return insertId;
    }

    /**
     * Pages of the open public tournaments (not started, not full) and of the master's own
     * (managed or joined). An offset past the end shows the last page.
     *
     * @param {number} userId
     * @param {{ mine: number, open: number }} offsets
     * @returns {Promise<{ open: object[], mine: object[], pages: { open: { offset: number, total: number }, mine: { offset: number, total: number } } }>}
     */
    static async list(userId, offsets) {
        const openWhere = "t.password = '' AND t.hash = '' AND (SELECT COUNT(*) FROM teams te WHERE te.tournament = t.id) < t.maxteams";
        const mineFrom = `FROM tournament t WHERE t.manager = ? OR t.id IN (
            SELECT te.tournament FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = ?)`;
        const columns = 't.id, t.name, t.description, t.maxteams, t.flex, (SELECT COUNT(*) FROM teams te WHERE te.tournament = t.id) AS teams';

        const [{ total: openTotal }] = await Mysql.select(`SELECT COUNT(*) AS total FROM tournament t WHERE ${openWhere}`);
        const [{ total: mineTotal }] = await Mysql.select(`SELECT COUNT(*) AS total ${mineFrom}`, [userId, userId]);
        const page = (offset, total) => (offset >= total ? Math.max(0, offset - TOURNAMENTS_PAGE_SIZE) : Math.max(0, offset));
        const openOffset = page(offsets.open, Number(openTotal));
        const mineOffset = page(offsets.mine, Number(mineTotal));

        const open = await Mysql.select(`SELECT ${columns} FROM tournament t WHERE ${openWhere} ORDER BY t.creation DESC LIMIT ? OFFSET ?`, [TOURNAMENTS_PAGE_SIZE, openOffset]);
        const mine = await Mysql.select(`SELECT ${columns} ${mineFrom} ORDER BY t.creation DESC LIMIT ? OFFSET ?`, [userId, userId, TOURNAMENTS_PAGE_SIZE, mineOffset]);
        const json = row => ({ id: row.id, name: row.name, description: row.description, maxTeams: row.maxteams, flex: Boolean(Number(row.flex)), teams: Number(row.teams) });
        return {
            open: open.map(json),
            mine: mine.map(json),
            pages: { open: { offset: openOffset, total: Number(openTotal) }, mine: { offset: mineOffset, total: Number(mineTotal) } },
        };
    }

    /**
     * The next tournament round a master's team is waiting for, with the server clock.
     *
     * @param {number} userId
     * @returns {Promise<{ name: string, hash: string, round: number, deadline: string, now: string }|null>}
     */
    static async next(userId) {
        const [row] = await Mysql.select(
            `SELECT t.name, t.hash, MAX(gr.round) AS round, MIN(gr.deadline) AS deadline, NOW(3) AS now
            FROM tournament t
            INNER JOIN teams te ON te.tournament = t.id
            INNER JOIN gladiator_teams gt ON gt.team = te.id
            INNER JOIN gladiators g ON g.cod = gt.gladiator
            INNER JOIN group_teams grt ON grt.team = te.id
            INNER JOIN \`groups\` gr ON gr.id = grt.groupid
            WHERE g.master = ? AND t.hash <> '' AND gr.log IS NULL
            GROUP BY t.id
            ORDER BY deadline ASC
            LIMIT 1`,
            [userId],
        );
        if (!row) return null;
        return { name: row.name, hash: row.hash, round: Number(row.round), deadline: row.deadline, now: row.now };
    }

    /**
     * Finds a tournament by name and password. Without a password, the master's own (managed or
     * joined) tournament's password is used, else the empty one of public tournaments.
     *
     * @param {number} userId
     * @param {string} name
     * @param {string} [password]
     * @returns {Promise<{ id: number, name: string, description: string, password: string, hash: string }>}
     * @throws {CustomError} 404 `TOURNAMENT_NOT_FOUND`.
     */
    static async find(userId, name, password) {
        let key = password;
        if (key === undefined) {
            const [own] = await Mysql.select(
                `SELECT t.password FROM tournament t WHERE t.name = ? AND (t.manager = ? OR t.id IN (
                    SELECT te.tournament FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = ?)) LIMIT 1`,
                [name, userId, userId],
            );
            key = own?.password ?? '';
        }
        const row = await Mysql.findOne('tournament', { filter: { name, password: key } });
        if (!row) throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');
        return { id: row.id, name: row.name, description: row.description, password: row.password, hash: row.hash };
    }

    /**
     * A tournament the caller may see: they know its password, or they manage it.
     *
     * @param {number} userId
     * @param {number} id
     * @param {string} [password]
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<Record<string, any>>} The `tournament` row.
     * @throws {CustomError} 404 `TOURNAMENT_NOT_FOUND` (also for a wrong password).
     */
    static async access(userId, id, password, context = {}) {
        const row = await Mysql.findOne('tournament', { filter: { id }, opt: { forUpdate: Boolean(context.connection) } }, context);
        if (!row || (row.manager !== userId && row.password !== (password ?? ''))) {
            throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');
        }
        return row;
    }

    /**
     * @param {number} tournamentId
     * @param {number} userId
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<number|null>} The team the master has a gladiator in, if any.
     */
    static async joinedTeam(tournamentId, userId, context = {}) {
        const [row] = await Mysql.select(
            `SELECT t.id FROM teams t INNER JOIN gladiator_teams gt ON gt.team = t.id INNER JOIN gladiators g ON g.cod = gt.gladiator
            WHERE t.tournament = ? AND g.master = ? LIMIT 1`,
            [tournamentId, userId],
            context,
        );
        return row?.id ?? null;
    }

    /**
     * The teams of a tournament still gathering them.
     *
     * @param {number} userId
     * @param {number} id
     * @param {string} [password]
     * @returns {Promise<{ started: true, hash: string }|{ started: false, maxTeams: number, manager: boolean, joined: number|null, filled: boolean, teams: Array<{ id: number, name: string, gladiators: number }> }>}
     */
    static async teams(userId, id, password) {
        const tournament = await Tournament.access(userId, id, password);
        if (tournament.hash) return { started: true, hash: tournament.hash };

        const teams = await Mysql.select(
            'SELECT te.id, te.name, (SELECT COUNT(*) FROM gladiator_teams gt WHERE gt.team = te.id) AS gladiators FROM teams te WHERE te.tournament = ? ORDER BY te.id',
            [id],
        );
        return {
            started: false,
            maxTeams: tournament.maxteams,
            manager: tournament.manager === userId,
            joined: await Tournament.joinedTeam(id, userId),
            filled: teams.every(team => Number(team.gladiators) >= TEAM_SIZE),
            teams: teams.map(team => ({ id: team.id, name: team.name, gladiators: Number(team.gladiators) })),
        };
    }

    /**
     * Creates a team with one of the master's gladiators.
     *
     * @param {number} userId
     * @param {number} id Tournament id.
     * @param {{ password?: string, name: string, gladiator: number, showCode: boolean }} team
     * @returns {Promise<{ id: number, word: string }>} The team id and its join word.
     * @throws {CustomError} 404, 409 `TOURNAMENT_STARTED`/`ALREADY_IN_TOURNAMENT`/`TOURNAMENT_FULL`/`TEAM_EXISTS`.
     */
    static async createTeam(userId, id, { password, name, gladiator, showCode }) {
        await Tournament.#ownGladiator(userId, gladiator);
        return Mysql.withTransaction(async context => {
            const tournament = await Tournament.access(userId, id, password, context);
            if (tournament.hash) throw new CustomError(409, 'The tournament has started.', 'TOURNAMENT_STARTED');
            if (await Tournament.joinedTeam(id, userId, context)) throw new CustomError(409, 'You already are in a team of this tournament.', 'ALREADY_IN_TOURNAMENT');
            if (await Mysql.count('teams', { tournament: id }, context) >= tournament.maxteams) throw new CustomError(409, 'The tournament is full.', 'TOURNAMENT_FULL');
            if (await Mysql.count('teams', { tournament: id, name }, context)) throw new CustomError(409, 'A team with this name exists.', 'TEAM_EXISTS');

            const word = teamWord();
            const { insertId } = await Mysql.insert('teams', { name, tournament: id, password: word, modified: Mysql.raw('NOW()') }, context);
            await Mysql.insert('gladiator_teams', { gladiator, team: insertId, visible: Number(showCode) }, context);
            return { id: insertId, word };
        });
    }

    /**
     * @param {number} userId
     * @param {number} gladiatorId
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND` when the gladiator is not the master's.
     */
    static async #ownGladiator(userId, gladiatorId) {
        if (!await Mysql.count('gladiators', { cod: gladiatorId, master: userId })) {
            throw new CustomError(404, 'Gladiator not found.', 'GLADIATOR_NOT_FOUND');
        }
    }

    /**
     * A team: members see its join word and gladiators, others only the masters' nicks.
     *
     * @param {number} userId
     * @param {number} teamId
     * @returns {Promise<{ id: number, name: string, word: string|null, tournament: number, flex: boolean, member: boolean, joined: number|null, gladiators: object[] }>}
     * @throws {CustomError} 404 `TEAM_NOT_FOUND`.
     */
    static async team(userId, teamId) {
        const [team] = await Mysql.select('SELECT te.id, te.name, te.password, te.tournament, t.flex FROM teams te INNER JOIN tournament t ON t.id = te.tournament WHERE te.id = ?', [teamId]);
        if (!team) throw new CustomError(404, 'Team not found.', 'TEAM_NOT_FOUND');
        const rows = await Mysql.select(
            `SELECT g.cod, g.name, g.vstr, g.vagi, g.vint, g.skin, g.master, u.apelido
            FROM gladiator_teams gt INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.id = g.master WHERE gt.team = ?`,
            [teamId],
        );
        const member = rows.some(row => row.master === userId);
        return {
            id: team.id,
            name: team.name,
            word: member ? team.password : null,
            tournament: team.tournament,
            flex: Boolean(Number(team.flex)),
            member,
            joined: await Tournament.joinedTeam(team.tournament, userId),
            gladiators: rows.map(row => (member
                ? { id: row.cod, name: row.name, vstr: row.vstr, vagi: row.vagi, vint: row.vint, skin: row.skin, master: row.apelido, mine: row.master === userId }
                : { master: row.apelido })),
        };
    }

    /**
     * The team and its tournament, locked for a change before the start.
     *
     * @param {number} teamId
     * @param {{ connection: unknown }} context
     * @returns {Promise<Record<string, any>>}
     * @throws {CustomError} 404 `TEAM_NOT_FOUND`, 409 `TOURNAMENT_STARTED`.
     */
    static async #openTeam(teamId, context) {
        const [team] = await Mysql.select(
            `SELECT te.id, te.password, te.tournament, t.flex, t.hash,
                (SELECT COUNT(*) FROM gladiator_teams WHERE team = te.id) AS gladiators
            FROM teams te INNER JOIN tournament t ON t.id = te.tournament WHERE te.id = ? FOR UPDATE`,
            [teamId],
            context,
        );
        if (!team) throw new CustomError(404, 'Team not found.', 'TEAM_NOT_FOUND');
        if (team.hash) throw new CustomError(409, 'The tournament has started.', 'TOURNAMENT_STARTED');
        return team;
    }

    /**
     * Joins a team with its word and one of the master's gladiators.
     *
     * @param {number} userId
     * @param {number} teamId
     * @param {{ word: string, gladiator: number, showCode: boolean }} entry
     * @throws {CustomError} 403 `WRONG_WORD`, 409 `ALREADY_IN_TOURNAMENT`/`TEAM_FULL`/`TOURNAMENT_STARTED`.
     */
    static async joinTeam(userId, teamId, { word, gladiator, showCode }) {
        await Tournament.#ownGladiator(userId, gladiator);
        await Mysql.withTransaction(async context => {
            const team = await Tournament.#openTeam(teamId, context);
            if (await Tournament.joinedTeam(team.tournament, userId, context)) throw new CustomError(409, 'You already are in a team of this tournament.', 'ALREADY_IN_TOURNAMENT');
            if (team.password !== word) throw new CustomError(403, 'Wrong team word.', 'WRONG_WORD');
            if (Number(team.gladiators) >= TEAM_SIZE) throw new CustomError(409, 'The team is full.', 'TEAM_FULL');
            await Tournament.#enlist(team.id, gladiator, showCode, context);
        });
    }

    /**
     * Adds another of the master's gladiators to their team (flexible tournaments let one master
     * bring several).
     *
     * @param {number} userId
     * @param {number} teamId
     * @param {{ word: string, gladiator: number, showCode: boolean }} entry
     * @throws {CustomError} 403 `NOT_A_MEMBER`/`WRONG_WORD`, 409 `TEAM_FULL`/`ALREADY_ENLISTED`/`SAME_GLADIATOR`.
     */
    static async addGladiator(userId, teamId, { word, gladiator, showCode }) {
        await Tournament.#ownGladiator(userId, gladiator);
        await Mysql.withTransaction(async context => {
            const team = await Tournament.#openTeam(teamId, context);
            const [{ mine }] = await Mysql.select(
                'SELECT COUNT(*) AS mine FROM gladiator_teams gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE gt.team = ? AND g.master = ?',
                [teamId, userId],
                context,
            );
            if (!Number(mine)) throw new CustomError(403, 'Join the team first.', 'NOT_A_MEMBER');
            if (team.password !== word) throw new CustomError(403, 'Wrong team word.', 'WRONG_WORD');
            if (Number(team.gladiators) >= TEAM_SIZE) throw new CustomError(409, 'The team is full.', 'TEAM_FULL');
            if (!Number(team.flex)) throw new CustomError(409, 'Each master brings one gladiator in this tournament.', 'ALREADY_ENLISTED');
            if (await Mysql.count('gladiator_teams', { team: teamId, gladiator }, context)) throw new CustomError(409, 'This gladiator is already in the team.', 'SAME_GLADIATOR');
            await Tournament.#enlist(team.id, gladiator, showCode, context);
        });
    }

    /**
     * @param {number} teamId
     * @param {number} gladiator
     * @param {boolean} showCode Teammates may read its code.
     * @param {{ connection: unknown }} context
     */
    static async #enlist(teamId, gladiator, showCode, context) {
        await Mysql.insert('gladiator_teams', { gladiator, team: teamId, visible: Number(showCode) }, context);
        await Mysql.update('teams', { modified: Mysql.raw('NOW()') }, { id: teamId }, context);
    }

    /**
     * Takes one of the master's gladiators out of a team; a team left empty is removed.
     *
     * @param {number} userId
     * @param {number} teamId
     * @param {number} [gladiator] Without it, all of the master's gladiators leave (leaving the team).
     * @returns {Promise<{ teamRemoved: boolean }>}
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND`, 409 `TOURNAMENT_STARTED`.
     */
    static async leave(userId, teamId, gladiator) {
        return Mysql.withTransaction(async context => {
            await Tournament.#openTeam(teamId, context);
            const mine = await Mysql.select(
                `SELECT gt.id FROM gladiator_teams gt INNER JOIN gladiators g ON g.cod = gt.gladiator
                WHERE gt.team = ? AND g.master = ?${gladiator === undefined ? '' : ' AND gt.gladiator = ?'}`,
                gladiator === undefined ? [teamId, userId] : [teamId, userId, gladiator],
                context,
            );
            if (!mine.length) throw new CustomError(404, 'Gladiator not found in the team.', 'GLADIATOR_NOT_FOUND');
            await Mysql.delete('gladiator_teams', { id: mine.map(row => row.id) }, context);

            if (!await Mysql.count('gladiator_teams', { team: teamId }, context)) {
                await Mysql.delete('teams', { id: teamId }, context);
                return { teamRemoved: true };
            }
            await Mysql.update('teams', { modified: Mysql.raw('NOW()') }, { id: teamId }, context);
            return { teamRemoved: false };
        });
    }

    /**
     * Removes a team (manager only).
     *
     * @param {number} userId
     * @param {number} id Tournament id.
     * @param {number} teamId
     * @throws {CustomError} 404 `TEAM_NOT_FOUND`.
     */
    static async kick(userId, id, teamId) {
        await Mysql.withTransaction(async context => {
            const [team] = await Mysql.select(
                "SELECT te.id FROM teams te INNER JOIN tournament t ON t.id = te.tournament WHERE te.id = ? AND t.id = ? AND t.manager = ? AND t.hash = ''",
                [teamId, id, userId],
                context,
            );
            if (!team) throw new CustomError(404, 'Team not found.', 'TEAM_NOT_FOUND');
            await Mysql.delete('gladiator_teams', { team: teamId }, context);
            await Mysql.delete('teams', { id: teamId }, context);
        });
    }

    /**
     * Deletes a tournament without teams (manager only).
     *
     * @param {number} userId
     * @param {number} id
     * @throws {CustomError} 403 `MANAGER_ONLY`, 409 `TOURNAMENT_STARTED`/`TOURNAMENT_NOT_EMPTY`.
     */
    static async remove(userId, id) {
        const tournament = await Mysql.findOne('tournament', { filter: { id } });
        if (!tournament) throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');
        if (tournament.manager !== userId) throw new CustomError(403, 'Only the manager can do this.', 'MANAGER_ONLY');
        if (tournament.hash) throw new CustomError(409, 'The tournament has started.', 'TOURNAMENT_STARTED');
        if (await Mysql.count('teams', { tournament: id })) throw new CustomError(409, 'Remove the teams first.', 'TOURNAMENT_NOT_EMPTY');
        await Mysql.delete('tournament', { id });
    }

    /**
     * Starts a tournament (manager only): every team needs its three gladiators. Teams are shuffled
     * into groups of up to five for round 1, and the masters are emailed.
     *
     * @param {number} userId
     * @param {number} id
     * @returns {Promise<string>} The tournament's public hash.
     * @throws {CustomError} 404, 409 `FEW_TEAMS`/`FEW_GLADIATORS`.
     */
    static async start(userId, id) {
        const hash = await Mysql.withTransaction(async context => {
            const [tournament] = await Mysql.select("SELECT id, maxtime FROM tournament WHERE id = ? AND manager = ? AND hash = '' FOR UPDATE", [id, userId], context);
            if (!tournament) throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');

            const teams = await Mysql.select('SELECT te.id, (SELECT COUNT(*) FROM gladiator_teams WHERE team = te.id) AS gladiators FROM teams te WHERE te.tournament = ?', [id], context);
            if (teams.length <= 1) throw new CustomError(409, 'A tournament needs two teams.', 'FEW_TEAMS');
            if (teams.some(team => Number(team.gladiators) < TEAM_SIZE)) throw new CustomError(409, 'Every team needs three gladiators.', 'FEW_GLADIATORS');

            const started = randomBytes(8).toString('hex');
            await Mysql.update('tournament', { hash: started }, { id }, context);
            const order = shuffle(teams.map(team => team.id));
            const groups = await createGroups(1, Math.ceil(order.length / GROUP_SIZE), tournament.maxtime, context);
            await Mysql.insert('group_teams', order.map((team, index) => ({ team, groupid: groups[index % groups.length] })), context);
            return started;
        });
        await Tournament.notifyRound(hash);
        return hash;
    }

    /**
     * Emails the masters still alive in a tournament that a round started (unless they opted out).
     *
     * @param {string} hash
     */
    static async notifyRound(hash) {
        const recipients = await Mysql.select(
            `SELECT DISTINCT u.email, u.apelido FROM usuarios u INNER JOIN gladiators g ON g.master = u.id
            INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament
            WHERE t.hash = ? AND u.pref_tourn = 1 AND gt.dead = 0`,
            [hash],
        );
        const [round] = await Mysql.select(
            `SELECT MAX(gr.round) AS round, t.name, DATE_FORMAT(MAX(gr.deadline), '%d/%m/%Y às %H:%i:%s') AS deadline
            FROM \`groups\` gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament
            WHERE t.hash = ? GROUP BY t.name`,
            [hash],
        );
        if (!recipients.length || !round) return;
        await sendMail('tournament', {
            subject: 'Torneio da gladCode',
            vars: { round: round.round, tourn: round.name, limit: round.deadline, hash },
            recipients: recipients.map(row => ({ email: row.email, name: row.apelido, vars: { usernick: row.apelido } })),
        });
    }
}

/**
 * @template T
 * @param {T[]} items
 * @returns {T[]} The items in random order (Fisher-Yates).
 */
export function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
        const other = randomInt(index + 1);
        [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
}

/**
 * Creates a round's groups, each with the tournament's round time as its deadline.
 *
 * @param {number} round
 * @param {number} count Groups to create.
 * @param {string} maxTime The tournament's round time (`HH:MM:SS`).
 * @param {{ connection: unknown }} context
 * @returns {Promise<number[]>} The group ids.
 */
export async function createGroups(round, count, maxTime, context) {
    if (!/^\d{1,3}:\d{2}:\d{2}$/.test(String(maxTime))) throw new CustomError(500, 'Invalid round time.', 'INVALID_ROUND_TIME');
    const groups = [];
    for (let index = 0; index < count; index++) {
        const { insertId } = await Mysql.insert('groups', { round, deadline: Mysql.raw(`ADDTIME(NOW(), '${maxTime}')`) }, context);
        groups.push(insertId);
    }
    return groups;
}
