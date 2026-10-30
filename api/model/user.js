import { createHash, randomInt } from 'node:crypto';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { Model } from './model.js';

/** Languages a gladiator can be written in. */
export const LANGUAGES = ['c', 'python', 'blocks'];
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
            insertFields: ['googleid', 'email', 'nome', 'apelido', 'sobrenome', 'pasta', 'ativo', 'foto'],
            allowUpdate: [
                'googleid', 'email', 'apelido', 'foto', 'ativo', 'showTutorial', 'editor_theme', 'editor_font', 'site_theme',
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

    /** Records that the user read the news feed, which clears the news counter. */
    async markNewsRead() {
        await Mysql.update('usuarios', { read_news: Mysql.raw('NOW(3)') }, { id: this.id });
    }

    /** Records that the user was just active. */
    async touch() {
        await Mysql.update('usuarios', { ativo: Mysql.raw('NOW()') }, { id: this.id });
    }

    /**
     * Applies profile changes. Only the fields present are changed.
     *
     * @param {{ nickname?: string, language?: string, preferences?: Record<string, boolean>, editorTheme?: string, editorFont?: number, showTutorial?: boolean, picture?: string, theme?: 'system'|'classic'|'arena-light'|'arena-dark' }} changes
     *   Already validated values; `picture` is the stored picture URL; `theme` `system` clears the choice.
     * @returns {Promise<User>}
     * @throws {CustomError} 409 `NICKNAME_TAKEN` when another account uses the nickname.
     */
    async saveProfile({ nickname, language, preferences, editorTheme, editorFont, showTutorial, picture, theme }) {
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
        };
        for (const [name, column] of Object.entries(PREFERENCES)) {
            if (preferences?.[name] !== undefined) changes[column] = Number(Boolean(preferences[name]));
        }
        return this.update(changes);
    }

    /** @returns {Record<string, unknown>} The signed-in user's own view of the account. */
    toJSON() {
        return {
            id: this.id,
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
            preferences: Object.fromEntries(Object.entries(PREFERENCES).map(([name, column]) => [name, Boolean(Number(this[column]))])),
            isAdmin: this.isAdmin,
        };
    }
}
