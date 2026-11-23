/**
 * Pure battle result rules, ported from battle_results.php and back_simulation.php.
 */

/** Highest renown a ranked battle gives. */
const MAX_REWARD = 10;
const TIME_WEIGHT = 1.5;
const WIN_WEIGHT = 1;
/** Master experience per ranked battle, and the winner's extra. */
const XP_PER_BATTLE = 100;
const XP_WIN = 150;
/** Highest master level. */
export const MAX_LEVEL = 60;
/** Battles a day that pay full silver; later ones pay a tenth. */
const MANAGED_BATTLES = 20;

/**
 * Whether a run's error output fails it. Battles that count (not sandboxed) are judged by the
 * engine log alone: a gladiator that crashes mid-battle is killed by the engine, and stderr (which
 * every gladiator can write to) must not discard a valid log, and without a log they report
 * `NO_OUTPUT` only: the compiler output quotes the code of every gladiator, other masters' code
 * included. Editor runs keep any error so the player sees it and cannot save broken code.
 *
 * @param {boolean} counts The battle is not a sandboxed editor run.
 * @param {unknown[]|null} simulation Parsed engine log.
 * @param {string} error Engine error output.
 * @returns {string} The error to report, `''` when the battle stands.
 */
export function battleError(counts, simulation, error) {
    if (!counts) return error;
    return simulation?.length ? '' : 'NO_OUTPUT';
}

/**
 * Log indexes of the gladiators the engine flagged as crashed (client died while alive). Indexes
 * beyond the battle size are ignored, as defense in depth against entries injected into the log.
 *
 * @param {Array<{ glads: Array<Record<string, unknown>> }>} simulation
 * @returns {number[]}
 */
export function crashedGladiators(simulation) {
    const size = simulation[0]?.glads?.length ?? 0;
    const crashed = new Set();
    for (const step of simulation) {
        step.glads?.forEach((glad, index) => {
            if (index < size && glad?.crashed) crashed.add(index);
        });
    }
    return [...crashed];
}

/**
 * The engine stores spaces in names as `#`.
 *
 * @param {string} text
 * @returns {string}
 */
export function engineText(text) {
    return String(text ?? '').replace(/#/g, ' ');
}

/**
 * The battle's gladiators from the winner down: survivors first, then the latest to die. `time` is
 * the last moment the gladiator's hp changed (its death, for the dead).
 *
 * @param {Array<{ simtime?: number, glads: Array<Record<string, any>> }>} simulation
 * @returns {Array<{ index: number, name: string, user: string, time: number, hp: number }>}
 */
export function deathOrder(simulation) {
    const glads = simulation[0].glads.map((glad, index) => ({ index, name: engineText(glad.name), user: engineText(glad.user), time: 0, hp: 0 }));
    for (const step of simulation) {
        step.glads?.forEach((glad, index) => {
            if (glad?.hp !== undefined && glads[index]) {
                glads[index].time = Number(step.simtime);
                glads[index].hp = Number(glad.hp);
            }
        });
    }
    return glads.sort((a, b) => {
        if (a.hp > 0 && b.hp <= 0) return -1;
        if (b.hp > 0 && a.hp <= 0) return 1;
        return b.time - a.time;
    });
}

/** Survival time added to a group battle's winners, so they rank above everyone who died. */
export const WINNER_BONUS = 1000;

/**
 * Places a group's teams: the winner first, then teams still alive, then by survival time and hp.
 *
 * @param {{ winner?: boolean, dead?: boolean, time: number, hp?: number }} a
 * @param {{ winner?: boolean, dead?: boolean, time: number, hp?: number }} b
 * @returns {number}
 */
export function placingOrder(a, b) {
    if (b.winner && !a.winner) return 1;
    if (a.winner && !b.winner) return -1;
    if (b.dead && !a.dead) return -1;
    if (a.dead && !b.dead) return 1;
    return (b.time - a.time) || ((b.hp ?? 0) - (a.hp ?? 0));
}

/**
 * Each gladiator's survival in a group battle: `time` is when it was last seen alive, or
 * 1000 + the end for the winner (alive at the end).
 *
 * @param {Array<{ simtime: number, glads: Array<Record<string, any>> }>} steps Expanded steps.
 * @returns {Array<{ name: string, user: string, time: number, hp: number, winner?: boolean }>}
 */
export function survival(steps) {
    const last = steps.at(-1);
    const result = last.glads.map(glad => {
        const entry = { name: engineText(glad.name), user: engineText(glad.user), time: 0, hp: 0 };
        if (glad.hp > 0) {
            entry.winner = true;
            entry.time = WINNER_BONUS + Number(last.simtime);
        }
        return entry;
    });
    for (const step of [...steps].reverse()) {
        step.glads.forEach((glad, index) => {
            if (result[index].time === 0 && glad.hp > 0) {
                result[index].time = Number(step.simtime);
                result[index].hp = glad.hp;
            }
        });
        if (result.every(entry => entry.time !== 0)) break;
    }
    return result;
}

/**
 * Renown change of each gladiator, in placing order: the winner (and anyone who lasted as long)
 * gets the most, the first to die loses the most, scaled by how strong each was against the
 * battle's average renown. Masters under 1000 renown lose less.
 *
 * @param {Array<{ mmr: number, time: number }>} glads From the winner down (see {@link deathOrder}).
 * @returns {number[]}
 */
export function calcReward(glads) {
    const count = glads.length;
    const last = glads[count - 1].time;
    const timeDiff = glads[1].time - last;

    let avgMmr = 0;
    const raw = glads.map((glad, index) => {
        let timeNorm = timeDiff === 0 ? 1 : (glad.time - last) / timeDiff;
        let win = 0;
        if (index === 0 || glad.time === glads[0].time) {
            win = 1;
            timeNorm = 1;
        }
        avgMmr += glad.mmr;
        return (timeNorm * count * TIME_WEIGHT) + (win * count * WIN_WEIGHT);
    });
    avgMmr /= count;
    const even = raw.reduce((sum, value) => sum + value, 0) / count;
    const weighted = raw.map(value => value - even);

    return glads.map((glad, index) => {
        const norm = weighted[0] !== 0 ? (weighted[index] / weighted[0]) * MAX_REWARD : 0;
        const mmrDev = avgMmr > 0 ? glad.mmr / avgMmr : 1;
        let reward = norm > 0 ? norm / Math.max(mmrDev, 0.5) : norm * Math.min(mmrDev, 2);
        // losing hurts less the closer the gladiator is to 0 renown
        if (reward < 0 && glad.mmr < 1000) reward += reward * (0.001 * glad.mmr - 1);
        return reward;
    });
}

/**
 * The authoritative ranked result of each gladiator, in placing order. The replay treats a battle
 * with no survivor at the last step as a draw (`web/public/script/playback.js` shows "Empate"), so
 * every entry is `draw`. With at least one survivor, {@link calcReward} says first place and anyone
 * who lasted as long as it (`index === 0 || time === first.time`) is a winner; everyone else loses.
 *
 * @param {Array<{ time: number }>} placed From the winner down (see {@link deathOrder}).
 * @param {boolean} anySurvivor Whether the last step has a gladiator with hp above zero.
 * @returns {Array<'win'|'loss'|'draw'>}
 */
export function rankedResults(placed, anySurvivor) {
    if (!anySurvivor) return placed.map(() => 'draw');
    const winnerTime = placed[0]?.time;
    return placed.map((entry, index) => (index === 0 || entry.time === winnerTime ? 'win' : 'loss'));
}

/**
 * Score of each gladiator of a training battle, in placing order: 10 for the winners, the others
 * by how long they lasted between the first to die and the runner-up, as back_training_run.php did.
 *
 * @param {Array<{ time: number, winner?: boolean }>} placed From the winner down (see {@link survival}).
 * @returns {number[]}
 */
export function trainingScores(placed) {
    const times = placed.map(entry => (entry.winner ? entry.time - WINNER_BONUS : entry.time));
    const last = times.at(-1);
    // a battle of one has no runner-up
    const timeDiff = (times[1] ?? 0) - last;
    const raw = placed.map((entry, index) => {
        const timeNorm = entry.winner || timeDiff === 0 ? 1 : (times[index] - last) / timeDiff;
        return (timeNorm * TIME_WEIGHT) + (entry.winner ? WIN_WEIGHT : 0);
    });
    return raw.map(value => (raw[0] ? (value / raw[0]) * MAX_REWARD : 0));
}

/**
 * Experience needed to go up from a level.
 *
 * @param {number} level
 * @param {number} gladiators Gladiators in a ranked battle.
 * @returns {number}
 */
export function xpToNextLevel(level, gladiators) {
    const average = (XP_PER_BATTLE * gladiators + XP_WIN) / gladiators;
    return (1.9 * level + 1) * average;
}

/**
 * What a ranked battle pays the master who started it: silver from the arena's income (more for
 * a winner, a tenth after the day's managed battles) and experience, possibly a level.
 *
 * @param {{ mmr: number, level: number, xp: number, won: boolean, battlesToday: number, gladiators: number }} battle
 *   `mmr` is the master's gladiator's renown before the battle.
 * @returns {{ silver: number, level: number, xp: number }} Silver earned, and the new level and experience.
 */
export function masterRewards({ mmr, level, xp, won, battlesToday, gladiators }) {
    const income = 1000 + (mmr - 1000) * 0.3;
    let silver = Math.max(0, (0.7 * income - 300) / 10 - 20);
    let gained = xp + XP_PER_BATTLE;
    if (won) {
        gained += XP_WIN;
        silver += (0.7 * income - 300) / 2;
    }
    if (battlesToday >= MANAGED_BATTLES) silver /= 10;

    let newLevel = level;
    const toNext = xpToNextLevel(level, gladiators);
    if (level === MAX_LEVEL) gained = 0;
    else if (gained >= toNext) {
        newLevel++;
        gained -= toNext;
    }
    return { silver, level: newLevel, xp: gained };
}
