import { api } from '../helpers/request.js';

/**
 * Battle runs (`/battles`). A run answers `{ hash, error }`: the battle log hash, or null with the
 * compiler or engine output (`INVALID_ATTR` and `NO_OUTPUT` are fixed codes).
 */
export class SimulationModel {
    /**
     * The editor's test battle (test-only commands allowed).
     *
     * @param {{ source: string, opponents: Array<{ sample: string }|{ id: number }>, breakpoints?: number[] }} battle
     *   `source` is the edited gladiator's full code with setup().
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ hash: string|null, error: string }>}
     */
    static test({ source, opponents, breakpoints = [] }, { signal } = {}) {
        return api.post('battles/test', { gladiator: { source }, opponents, breakpoints }, { signal });
    }
}
