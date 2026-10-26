/**
 * Tournament dev tools from the shell, without signing in (the same model as the admin routes).
 * Exports go to stdout and imports read stdin, so files stay on the host:
 *
 *   docker compose exec -T api node scripts/dev-tournament.js list
 *   docker compose exec -T api node scripts/dev-tournament.js create "Test Cup" 8 00:10:00 [managerEmail]
 *   docker compose exec -T api node scripts/dev-tournament.js list-real [page] [limit]
 *   docker compose exec -T api node scripts/dev-tournament.js reset <id|hash> <round>
 *   docker compose exec -T api node scripts/dev-tournament.js cleanup <id>
 *   docker compose exec -T api node scripts/dev-tournament.js cleanup-all YES_DELETE_ALL
 *   docker compose exec -T api node scripts/dev-tournament.js export <id|hash> > tournament.json
 *   docker compose exec -T api node scripts/dev-tournament.js import [tournamentId] < tournament.json
 *
 * `dev-tools/tournament.sh` wraps these commands.
 */
import { text } from 'node:stream/consumers';
import { Mysql } from '../helpers/mysql.js';
import { DevTournament } from '../model/dev-tournament.js';

const USAGE = `Usage: node scripts/dev-tournament.js <command>
  list                                        test tournaments
  create [name] [teams] [maxTime] [manager]   test tournament of random full teams (manager email,
                                              default the first of ADMIN_EMAILS)
  list-real [page] [limit]                    real tournaments
  reset <id|hash> <round>                     back to the start of a round
  cleanup <id>                                delete a test tournament
  cleanup-all YES_DELETE_ALL                  delete every test tournament
  export <id|hash>                            JSON to stdout
  import [tournamentId]                       JSON from stdin; with an id, replaces that tournament`;

/**
 * @param {string[]} args
 * @returns {Promise<unknown>} What to print.
 */
async function run([command, ...args]) {
    switch (command) {
        case 'list':
            return DevTournament.listTest();
        case 'create': {
            const managerEmail = args[3] || String(process.env.ADMIN_EMAILS || '').split(',')[0].trim();
            if (!managerEmail) throw new Error('Pass a manager email or set ADMIN_EMAILS.');
            return DevTournament.bootstrap({
                name: args[0] || `Test Tournament ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
                teams: Number(args[1] || 8),
                maxTime: args[2] || '00:10:00',
                managerEmail,
            });
        }
        case 'list-real':
            return DevTournament.listReal({ page: Number(args[0] || 1), limit: Number(args[1] || 10) });
        case 'reset':
            if (!args[0] || !Number(args[1])) throw new Error('Usage: reset <id|hash> <round>');
            return DevTournament.reset(args[0], Number(args[1]));
        case 'cleanup':
            if (!Number(args[0])) throw new Error('Usage: cleanup <id>');
            return DevTournament.remove(Number(args[0]));
        case 'cleanup-all':
            if (args[0] !== 'YES_DELETE_ALL') throw new Error('Confirm with: cleanup-all YES_DELETE_ALL');
            return DevTournament.removeAllTest();
        case 'export':
            if (!args[0]) throw new Error('Usage: export <id|hash>');
            return DevTournament.export(args[0]);
        case 'import': {
            const data = JSON.parse(await text(process.stdin));
            return args[0]
                ? DevTournament.import(data, { mode: 'update', tournamentId: Number(args[0]) })
                : DevTournament.import(data, { mode: 'create' });
        }
        default:
            console.error(USAGE);
            process.exitCode = command ? 1 : 0;
            return undefined;
    }
}

try {
    const result = await run(process.argv.slice(2));
    if (result !== undefined) console.log(JSON.stringify(result, null, 2));
}
catch (error) {
    console.error(error.code ? `${error.code}: ${error.message}` : error.message);
    process.exitCode = 1;
}
finally {
    await Mysql.close();
}
