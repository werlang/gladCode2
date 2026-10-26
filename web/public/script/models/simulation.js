import { api } from '../helpers/request.js';

/**
 * Battle simulations (`back_simulation.php`).
 */
export class SimulationModel {
    /**
     * Runs a battle.
     *
     * @param {object} args What to simulate: `glads` (objects with name, user,
     *   code, skin, vstr, vagi, vint, or gladiator ids) or a `tournament` /
     *   `training` group with its `origin`, plus flags such as `ranked`, `duel`
     *   or `force`.
     * @param {{ signal?: AbortSignal }} [options] Abort signal.
     * @returns {Promise<{ simulation: string|null, error: string, output: string }|string>}
     *   `simulation` is the battle log hash; text means the backend broke.
     */
    static run(args, { signal } = {}) {
        return api.post('back_simulation.php', { args: JSON.stringify(args) }, { signal });
    }
}
