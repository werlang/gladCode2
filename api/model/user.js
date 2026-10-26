import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { Model } from './model.js';

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
                'googleid', 'email', 'apelido', 'foto', 'ativo', 'showTutorial', 'editor_theme', 'editor_font',
                'pref_message', 'pref_friend', 'pref_update', 'pref_duel', 'pref_tourn', 'pref_language',
                'silver', 'credits', 'apothecary', 'lvl', 'xp',
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

    /** @returns {boolean} True when the account's email is listed in `ADMIN_EMAILS`. */
    get isAdmin() {
        const admins = String(process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
        return admins.includes(String(this.email || '').toLowerCase());
    }
}
