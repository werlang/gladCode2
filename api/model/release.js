import { sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';

/** Version masters' gladiators fall to when their client crashed in a ranked battle. */
const BROKEN = 'broken';
/** The announcement being sent, if any: one at a time. */
let announcing = null;

/**
 * The running release (administrators only). The version is `api/version`, bumped in a commit
 * and deployed; here the gladiators saved on an older version can be carried forward, and the
 * masters who asked for update news are emailed.
 */
export class Release {
    /**
     * @returns {Promise<{ version: string, announcing: boolean, gladiators: Array<{ version: string, count: number }> }>}
     *   How many gladiators each version holds, the current one first.
     */
    static async current() {
        const rows = await Mysql.select('SELECT version, COUNT(*) AS count FROM gladiators GROUP BY version ORDER BY COUNT(*) DESC');
        const gladiators = rows.map(row => ({ version: row.version, count: Number(row.count) }))
            .sort((a, b) => Number(b.version === VERSION) - Number(a.version === VERSION));
        return { version: VERSION, announcing: Boolean(announcing), gladiators };
    }

    /**
     * Moves the gladiators saved on an older version to the current one, for a release that does
     * not change what their code does.
     *
     * @param {string} from
     * @returns {Promise<number>} Gladiators moved.
     * @throws {CustomError} 400 `INVALID_FROM` for the current or the broken version.
     */
    static async carryForward(from) {
        if (from === VERSION || from === BROKEN) throw new CustomError(400, 'Choose an older version.', 'INVALID_FROM');
        return Mysql.update('gladiators', { version: VERSION }, { version: from });
    }

    /**
     * Emails the release to the masters who asked for update news and did not get this version's
     * yet, in the background; each master is marked as soon as their email goes out, so sending
     * again only reaches the rest.
     *
     * @param {{ changes: string, postLink: string }} announcement `changes` is the administrator's HTML.
     * @returns {Promise<number>} Masters it is being sent to.
     * @throws {CustomError} 409 `ANNOUNCEMENT_RUNNING`.
     */
    static async announce({ changes, postLink }) {
        if (announcing) throw new CustomError(409, 'The announcement is still being sent.', 'ANNOUNCEMENT_RUNNING');
        const rows = await Mysql.select(
            "SELECT id, apelido, email FROM usuarios WHERE pref_update = 1 AND (email_update IS NULL OR email_update != ?) AND email != ''",
            [VERSION],
        );
        const recipients = rows.map(row => ({ id: row.id, email: row.email, name: row.apelido }));
        if (!recipients.length) return 0;

        announcing = sendMail('update', {
            subject: 'Atualização na gladCode',
            recipients,
            vars: { version: VERSION, changes, postlink: postLink },
            raw: ['changes'],
            onSent: recipient => Mysql.update('usuarios', { email_update: VERSION }, { id: recipient.id }),
        })
            .then(result => console.log(JSON.stringify({ event: 'release_announced', version: VERSION, ...result })))
            .catch(error => console.error('Release announcement failed:', error.message))
            .finally(() => {
                announcing = null;
            });
        return recipients.length;
    }
}
