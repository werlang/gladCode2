import { createHash, randomInt } from 'node:crypto';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { Model } from './model.js';

/** Languages a gladiator can be written in. */
export const LANGUAGES = ['c', 'python', 'blocks'];
/** How a master sees gladiators across the site: the pixel-art sprites or the 3D coliseum. */
export const GLAD_VIEWS = ['sprite', '3d'];
/** The gladiator style of a master who has not chosen one: the site's current 3D coliseum look. */
export const DEFAULT_GLAD_VIEW = '3d';
/** Email notification switches, by JSON name and column. */
const PREFERENCES = { message: 'pref_message', friend: 'pref_friend', update: 'pref_update', duel: 'pref_duel', tourn: 'pref_tourn' };

/**
 * The default avatar: a Gravatar identicon seeded by the email (salted, so it never reveals a real
 * Gravatar). Same formula as the PHP backend, so existing avatars keep their look.
 *
 * @param {string} email
 * @returns {string}
 */
export function defaultPicture(email) {
    const hash = createHash('md5').update(`gladcodehashsecret36${String(email).trim().toLowerCase()}`).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=retro`;
}

/**
 * A gladCode account (`usuarios`). Accounts are created and linked through Google sign-in.
 */
export class User extends Model {
    /** @param {Record<string, unknown>} [fields] A `usuarios` row. */
    constructor(fields = {}) {
        super('usuarios', {
            fields,
            insertFields: ['googleid', 'email', 'nome', 'apelido', 'sobrenome', 'pasta', 'ativo', 'created_at', 'created_at_known', 'foto'],
            allowUpdate: [
                'googleid', 'email', 'apelido', 'foto', 'ativo', 'showTutorial', 'editor_theme', 'editor_font', 'site_theme', 'glad_view',
                ...Object.values(PREFERENCES), 'pref_language', 'silver', 'credits', 'apothecary', 'lvl', 'xp',
            ],
        });
    }

    /**
     * @param {number|string} id
     * @param {Parameters<typeof Mysql.get>[2]} [context]
     * @returns {Promise<User>}
     * @throws {CustomError} 404 `USER_NOT_FOUND`.
     */
    static async findById(id, context = {}) {
        const row = await Mysql.findOne('usuarios', { filter: { id } }, context);
        if (!row) throw new CustomError(404, 'User not found.', 'USER_NOT_FOUND');
        return new User(row);
    }

    /**
     * Finds the account of a verified Google identity, linking it by email the first time, or
     * creates one with a numbered nickname from the given name. An account already linked to
     * another Google identity is never taken over by email (a recycled address, for one).
     *
     * @param {{ email: string, givenName: string, familyName: string, sub: string }} identity
     * @returns {Promise<User>}
     * @throws {CustomError} 403 `GOOGLE_ACCOUNT_MISMATCH`.
     */
    static async signInWithGoogle({ email, givenName, familyName, sub }) {
        const rows = await Mysql.select('SELECT * FROM usuarios WHERE email = ? OR googleid = ? ORDER BY googleid = ? DESC LIMIT 1', [email, sub, sub]);
        if (rows.length) {
            const user = new User(rows[0]);
            if (user.googleid && user.googleid !== sub) {
                throw new CustomError(403, 'This email belongs to an account of another Google identity.', 'GOOGLE_ACCOUNT_MISMATCH');
            }
            if (user.googleid !== sub || user.email !== email) await user.update({ googleid: sub, email });
            return user;
        }

        const user = new User({
            googleid: sub,
            email,
            nome: givenName,
            sobrenome: familyName,
            apelido: `${givenName.slice(0, 26)}${randomInt(100, 1000)}`,
            pasta: createHash('md5').update(email).digest('hex'),
            ativo: Mysql.raw('NOW()'),
            created_at: Mysql.raw('NOW()'),
            created_at_known: 1,
            foto: defaultPicture(email),
        });
        await user.insert();
        return User.findById(user.id);
    }

    /** @returns {boolean} True when the account's email is listed in `ADMIN_EMAILS`. */
    get isAdmin() {
        const admins = String(process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
        return admins.includes(String(this.email || '').toLowerCase());
    }

    /**
     * Records that the user read the news feed, which clears the news counter.
     *
     * @returns {Promise<string>} The server marker written to `read_news`, for the caller's feed.
     */
    async markNewsRead() {
        const [row] = await Mysql.select('SELECT NOW(3) AS marker');
        await Mysql.update('usuarios', { read_news: row.marker }, { id: this.id });
        return row.marker;
    }

    /** Records that the user was just active. */
    async touch() {
        await Mysql.update('usuarios', { ativo: Mysql.raw('NOW()') }, { id: this.id });
    }

    /**
     * Whether a nickname is free for this master.
     *
     * @param {number} userId
     * @param {string} nickname
     * @returns {Promise<boolean>}
     */
    static async nicknameAvailable(userId, nickname) {
        const row = await Mysql.findOne('usuarios', { filter: { apelido: nickname }, view: ['id'] });
        return !row || row.id === userId;
    }

    /**
     * Applies profile changes. Only the fields present are changed.
     *
     * @param {{ nickname?: string, language?: string, preferences?: Record<string, boolean>, editorTheme?: string, editorFont?: number, showTutorial?: boolean, picture?: string, theme?: 'system'|'classic'|'arena-light'|'arena-dark', gladView?: 'sprite'|'3d' }} changes
     *   Already validated values; `picture` is the stored picture URL; `theme` `system` clears the choice; `gladView` is how gladiators are drawn.
     * @returns {Promise<User>}
     * @throws {CustomError} 409 `NICKNAME_TAKEN` when another account uses the nickname.
     */
    async saveProfile({ nickname, language, preferences, editorTheme, editorFont, showTutorial, picture, theme, gladView }) {
        if (nickname !== undefined && nickname !== this.apelido) {
            const taken = await Mysql.findOne('usuarios', { filter: { apelido: nickname, id: { not: this.id } }, view: ['id'] });
            if (taken) throw new CustomError(409, 'Este nome já está em uso.', 'NICKNAME_TAKEN');
        }

        const changes = {
            apelido: nickname,
            pref_language: language,
            editor_theme: editorTheme,
            editor_font: editorFont,
            showTutorial: showTutorial === undefined ? undefined : Number(showTutorial),
            foto: picture,
            site_theme: theme === undefined ? undefined : (theme === 'system' ? null : theme),
            glad_view: gladView,
        };
        for (const [name, column] of Object.entries(PREFERENCES)) {
            if (preferences?.[name] !== undefined) changes[column] = Number(Boolean(preferences[name]));
        }
        return this.update(changes);
    }

    /**
     * The profile hero's numbers: ranked battles, wins, known results and the best gladiator's
     * renown. Only the engine's reported result counts: `wins` are `result = 'win'` and `known` is
     * every report with a result (`win`, `loss` or `draw`). Unknown historical results stay out of
     * the win-rate denominator. A battle with no survivor is a draw, and ties for first follow
     * `calcReward`'s equal-survival-time rule (api/helpers/battle-results.js).
     *
     * @param {number} userId
     * @returns {Promise<{ battles: number, wins: number, known: number, renown: number }>}
     */
    static async stats(userId) {
        const [row] = await Mysql.select(
            `SELECT
                (SELECT COUNT(*) FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE g.master = ?) AS battles,
                (SELECT COUNT(*) FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE g.master = ? AND r.result = 'win') AS wins,
                (SELECT COUNT(*) FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE g.master = ? AND r.result IS NOT NULL) AS known,
                (SELECT COALESCE(MAX(mmr), 0) FROM gladiators WHERE master = ?) AS renown`,
            [userId, userId, userId, userId],
        );
        return {
            battles: Number(row.battles),
            wins: Number(row.wins),
            known: Number(row.known),
            renown: Math.round(Number(row.renown)),
        };
    }

    /** @returns {Promise<Record<string, unknown>>} The account plus the profile hero's stats. */
    async profileJSON() {
        return { ...this.toJSON(), stats: await User.stats(this.id) };
    }

    /** @returns {Record<string, unknown>} The signed-in user's own view of the account. */
    toJSON() {
        // Rows written before the provenance column existed are unit-test fixtures; a stored date
        // there is treated as known. The database always sends the flag after migration 013.
        const createdKnown = this.created_at_known === undefined
            ? Boolean(this.created_at)
            : Boolean(Number(this.created_at_known));
        return {
            id: this.id,
            joinedAt: createdKnown ? (this.created_at ?? null) : null,
            email: this.email,
            nickname: this.apelido,
            firstName: this.nome,
            lastName: this.sobrenome,
            picture: this.foto || defaultPicture(this.email),
            language: this.pref_language,
            level: this.lvl,
            xp: this.xp,
            silver: this.silver,
            credits: this.credits,
            premium: Boolean(this.premium),
            apothecary: this.apothecary,
            showTutorial: Boolean(Number(this.showTutorial)),
            editorTheme: this.editor_theme,
            editorFont: this.editor_font,
            theme: this.site_theme || 'system',
            gladView: GLAD_VIEWS.includes(this.glad_view) ? this.glad_view : DEFAULT_GLAD_VIEW,
            preferences: Object.fromEntries(Object.entries(PREFERENCES).map(([name, column]) => [name, Boolean(Number(this[column]))])),
            isAdmin: this.isAdmin,
        };
    }
}
