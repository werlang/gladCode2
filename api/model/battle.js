import { battleError, engineText } from '../helpers/battle-results.js';
import { detectLanguage, hasValidSetup, insertBreakpoints, prepareEditorSource, setupBlock } from '../helpers/gladiator-code.js';
import { Mysql } from '../helpers/mysql.js';
import { runBattle } from '../helpers/runner.js';
import { BattleLog } from './battle-log.js';

/** Hashes of `skins` rows are md5, 32 characters; anything else is the skin JSON itself. */
const SKIN_HASH_LENGTH = 32;

/**
 * One battle being set up and run: gladiators sent as source by the editor and saved gladiators,
 * in battle order.
 */
export class Battle {
    /** @type {Array<{ code: string, edited?: boolean }>} */
    #entries = [];
    /** Skin of each `name@nick` in the battle (JSON text, or a `skins` hash to look up). */
    #skins = new Map();
    #breakpoints = [];
    /** Saved gladiators in the battle by `name@nick`: their key and master. */
    #saved = new Map();

    /**
     * @param {{ origin: string, sandbox?: boolean, noitems?: boolean }} options `sandbox` for editor
     *   runs (test-only commands allowed); `noitems` for tournaments (no potions).
     */
    constructor({ origin, sandbox = false, noitems = false }) {
        this.origin = origin;
        this.sandbox = sandbox;
        this.noitems = noitems;
    }

    /**
     * Adds a gladiator sent as full source by the editor.
     *
     * @param {string} source
     * @param {{ edited?: boolean }} [options] `edited` marks the gladiator being edited (it gets the breakpoints).
     * @returns {this}
     */
    addSource(source, { edited = false } = {}) {
        const { code, name, nick, skin } = prepareEditorSource(source, `user${this.#entries.length}`);
        if (skin) this.#skins.set(`${name}@${nick}`, skin);
        this.#entries.push({ code, edited });
        return this;
    }

    /**
     * Adds a gladiator that is not saved yet (the save test): its code with a generated setup().
     *
     * @param {{ name: string, nick: string, vstr: number, vagi: number, vint: number, skin: string, code: string }} glad
     * @returns {this}
     */
    addDraft({ name, nick, vstr, vagi, vint, skin, code }) {
        this.#skins.set(`${name}@${nick}`, skin);
        const setup = setupBlock(detectLanguage(code), { name, nick, vstr, vagi, vint, slots: '0,0,0,0' });
        this.#entries.push({ code: setup + code, edited: true });
        return this;
    }

    /**
     * Adds saved gladiators, with their master's potions unless the battle forbids items.
     *
     * @param {number[]} ids Gladiator keys, kept in this order.
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<this>}
     */
    async addGladiators(ids, context = {}) {
        if (!ids.length) return this;
        const rows = await Mysql.select(
            `SELECT g.cod, g.name, g.vstr, g.vagi, g.vint, g.skin, g.code, u.id AS master, u.apelido
            FROM gladiators g INNER JOIN usuarios u ON u.id = g.master
            WHERE g.cod IN (${ids.map(() => '?').join(',')}) ORDER BY FIELD(g.cod, ${ids.map(() => '?').join(',')})`,
            [...ids, ...ids],
            context,
        );

        for (const row of rows) {
            const slots = this.noitems ? '0,0,0,0' : await Battle.#slots(row.master, context);
            this.#skins.set(`${row.name}@${row.apelido}`, row.skin);
            this.#saved.set(`${row.name}@${row.apelido}`, { id: row.cod, master: row.master });
            const setup = setupBlock(detectLanguage(row.code), {
                name: row.name, nick: row.apelido, vstr: row.vstr, vagi: row.vagi, vint: row.vint, slots,
            });
            this.#entries.push({ code: setup + row.code });
        }
        return this;
    }

    /**
     * The master's four soonest-expiring active potion slots, as the engine's `setSlots` list.
     *
     * @param {number} masterId
     * @param {Parameters<typeof Mysql.select>[2]} context
     * @returns {Promise<string>}
     */
    static async #slots(masterId, context) {
        const rows = await Mysql.select('SELECT item FROM slots WHERE user = ? AND expire > NOW() ORDER BY expire LIMIT 4', [masterId], context);
        return Array.from({ length: 4 }, (unused, index) => rows[index]?.item ?? '0').join(',');
    }

    /**
     * Pauses the replay on these lines of the edited gladiator.
     *
     * @param {number[]} lines
     * @returns {this}
     */
    setBreakpoints(lines) {
        this.#breakpoints = lines;
        return this;
    }

    /**
     * The saved gladiator a log entry is.
     *
     * @param {string} name Name as the log has it (spaces as `#` are fine).
     * @param {string} nick Master nick as the log has it.
     * @returns {{ id: number, master: number }|undefined}
     */
    savedGladiator(name, nick) {
        return this.#saved.get(`${engineText(name)}@${engineText(nick)}`);
    }

    /** @returns {number} Gladiators in the battle. */
    get size() {
        return this.#entries.length;
    }

    /**
     * Runs the battle and stores its log.
     *
     * @param {{ store?: boolean }} [options] `store: false` runs without keeping a log (the save test).
     * @returns {Promise<{ log: BattleLog|null, simulation: unknown[]|null, error: string }>}
     *   `error` is `INVALID_ATTR` (an attribute setup breaks the rules), `NO_OUTPUT` (the engine
     *   wrote no log) or the engine's error output; `log` is null whenever the battle does not stand.
     */
    async run({ store = true } = {}) {
        const codes = this.#entries.map(({ code, edited }) => (edited && this.#breakpoints.length ? insertBreakpoints(code, this.#breakpoints) : code));
        if (!codes.every(hasValidSetup)) return { log: null, simulation: null, error: 'INVALID_ATTR' };

        const { simlog, error: output } = await runBattle(codes, { sandbox: this.sandbox, noitems: this.noitems });
        let simulation = null;
        try {
            simulation = simlog ? JSON.parse(simlog) : null;
        }
        catch {
            simulation = null;
        }

        const error = battleError(!this.sandbox, simulation, output);
        if (error) {
            // the answer of a battle that counts hides the compiler output: keep it for the logs
            if (error !== output) console.error(JSON.stringify({ event: 'battle_without_log', origin: this.origin, output }));
            return { log: null, simulation: null, error };
        }
        if (!simulation?.length) return { log: null, simulation: null, error: 'NO_OUTPUT' };

        if (!store) return { log: null, simulation, error: '' };
        await this.#attachSkins(simulation);
        const log = await BattleLog.create(simulation, this.origin);
        return { log, simulation, error: '' };
    }

    /**
     * Writes each gladiator's skin into the first step of the log, where the replay reads it.
     *
     * @param {Array<{ glads: Array<Record<string, any>> }>} simulation
     */
    async #attachSkins(simulation) {
        const isHash = skin => skin?.length === SKIN_HASH_LENGTH && !skin.startsWith('[');
        const hashes = [...this.#skins.values()].filter(isHash);
        const stored = hashes.length
            ? new Map((await Mysql.find('skins', { filter: { hash: hashes }, view: ['hash', 'skin'] })).map(row => [row.hash, row.skin]))
            : new Map();

        for (const glad of simulation[0].glads) {
            const skin = this.#skins.get(`${engineText(glad.name)}@${engineText(glad.user)}`);
            const resolved = isHash(skin) ? stored.get(skin) : skin;
            if (resolved) glad.skin = resolved;
        }
    }
}
