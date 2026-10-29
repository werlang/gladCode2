/**
 * Runs a battle between saved gladiators from the shell, outside every game mode: no renown,
 * silver, report or ranking changes, and no sandbox. For triage, such as finding which opponent
 * of a ranked pool breaks battles. `--keep` stores the log (origin `editor`) so it can be replayed
 * at /play/<hash>; otherwise only the outcome is printed.
 *
 * Usage: docker compose exec -T api node scripts/battle.js <gladiatorId> <gladiatorId> [...] [--keep]
 */
import { Mysql } from '../helpers/mysql.js';
import { Battle } from '../model/battle.js';

const keep = process.argv.includes('--keep');
const ids = process.argv.slice(2).filter(arg => arg !== '--keep').map(Number);

try {
    if (ids.length < 2 || ids.some(id => !Number.isInteger(id) || id <= 0)) {
        throw new Error('Usage: node scripts/battle.js <gladiatorId> <gladiatorId> [...] [--keep]');
    }
    const battle = await new Battle({ origin: 'editor' }).addGladiators(ids);
    const { log, simulation, error } = await battle.run({ store: keep });
    console.log(JSON.stringify({ hash: log?.hash ?? null, steps: simulation?.length ?? 0, error }, null, 2));
}
catch (error) {
    console.error(error.code ? `${error.code}: ${error.message}` : error.message);
    process.exitCode = 1;
}
finally {
    await Mysql.close();
}
