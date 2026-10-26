/**
 * Development helper: prints a session token for an account, to sign in without Google during
 * local testing. Set it as the `app_session` cookie for `localhost`. Refuses to run in production.
 *
 * Usage: docker compose exec api node scripts/issue-session.js <userId>
 */
import { signJwt } from '../helpers/jwt.js';

if (process.env.NODE_ENV === 'production') {
    console.error('issue-session is for development only.');
    process.exit(1);
}

const id = Number(process.argv[2]);
if (!Number.isInteger(id) || id <= 0) {
    console.error('Usage: node scripts/issue-session.js <userId>');
    process.exit(1);
}

console.log(await signJwt({ id }));
