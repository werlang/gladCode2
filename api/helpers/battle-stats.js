/** Engine action ids of the abilities counted in the statistics. */
const ABILITY_IDS = {
    fireball: 0,
    teleport: 1,
    charge: 2,
    block: 3,
    assassinate: 4,
    ambush: 5,
    melee: 6,
    ranged: 7,
};

/** Engine action id of a potion use. */
const USE_ITEM = 11;

/** Simulation steps in 5 seconds (one step every 0.1 s). */
const FIVE_SECONDS = 50;

/**
 * Merges `source` into `target` recursively, like the replay's step expansion.
 *
 * @param {object} target Merged into.
 * @param {object} source Merged from.
 * @returns {object} `target`.
 */
function deepMerge(target, source) {
    Object.entries(source).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            target[key] ??= Array.isArray(value) ? [] : {};
            deepMerge(target[key], value);
        }
        else {
            target[key] = value;
        }
    });
    return target;
}

/**
 * Expands a simlog's incremental steps (each holds only what changed) into
 * complete steps.
 *
 * @param {object[]} steps Incremental steps.
 * @returns {object[]} Complete steps.
 */
export function expandSteps(steps) {
    const state = {};
    return steps.map(step => {
        state.projectiles = {};
        deepMerge(state, step);
        return structuredClone(state);
    });
}

/**
 * The attribute a gladiator invested most in (later attributes win ties).
 *
 * @param {{ STR: number, AGI: number, INT: number }} glad Gladiator state.
 * @returns {'STR'|'AGI'|'INT'}
 */
function highestAttribute({ STR, AGI, INT }) {
    if (INT >= STR && INT >= AGI) return 'INT';
    if (AGI >= STR && AGI >= INT) return 'AGI';
    return 'STR';
}

/**
 * Computes the statistics a finished battle contributes to the stats page.
 *
 * @param {object[]} incrementalSteps The simlog steps as stored.
 * @returns {{
 *   uses: Record<string, number>, win: string[], avglvl: number, winnerlvl: number,
 *   duration: number, high: { STR: number, AGI: number, INT: number },
 *   potionuse: string[], potionwin: string[],
 * }} Ability uses, the abilities and main attributes of the winners, the
 *   average level of the gladiators alive in the last 5 seconds, the winners'
 *   level, the duration, how many gladiators favoured each attribute and the
 *   potions used and used by winners.
 */
export function battleStats(incrementalSteps) {
    const steps = expandSteps(incrementalSteps);
    const last = steps.at(-1);
    const uses = Object.fromEntries(Object.keys(ABILITY_IDS).map(name => [name, 0]));
    const charging = {};

    // the winners are the gladiators alive in the last step that has any
    let winners = [];
    for (let index = steps.length - 1; index >= 0 && !winners.length; index--) {
        winners = Object.keys(steps[index].glads).filter(id => steps[index].glads[id].hp > 0);
    }

    const winnerAbilities = new Set();
    const potionuse = new Set();
    const potionwin = new Set();

    steps.forEach(step => {
        Object.entries(ABILITY_IDS).forEach(([name, id]) => {
            Object.entries(step.glads).forEach(([glad, state]) => {
                if (state.action != id) return;
                // a charge counts once, when the gladiator does anything after it
                if (name === 'charge') charging[glad] = true;
                else if (charging[glad]) {
                    charging[glad] = false;
                    uses.charge++;
                }
                else uses[name]++;
            });
            if (winners.some(glad => step.glads[glad].action == id)) {
                winnerAbilities.add(name);
            }
        });

        Object.entries(step.glads).forEach(([glad, state]) => {
            if (parseInt(state.action, 10) !== USE_ITEM) return;
            const potion = state.code.split('useItem("')[1].split('"')[0];
            potionuse.add(potion);
            if (winners.includes(glad)) potionwin.add(potion);
        });
    });

    const recent = steps[Math.max(0, steps.length - FIVE_SECONDS - 1)].glads;
    const alive = Object.keys(recent).filter(id => recent[id].hp > 0);
    const avglvl = alive.reduce((sum, id) => sum + last.glads[id].lvl, 0) / alive.length;
    const winnerlvl = winners.reduce((sum, id) => sum + last.glads[id].lvl, 0) / winners.length;

    const high = { STR: 0, AGI: 0, INT: 0 };
    const win = [...winnerAbilities];
    Object.entries(last.glads).forEach(([id, glad]) => {
        const attribute = highestAttribute(glad);
        high[attribute]++;
        if (winners.includes(id)) win.push(attribute);
    });

    return {
        uses,
        win,
        avglvl,
        winnerlvl,
        duration: last.simtime,
        high,
        potionuse: [...potionuse],
        potionwin: [...potionwin],
    };
}
