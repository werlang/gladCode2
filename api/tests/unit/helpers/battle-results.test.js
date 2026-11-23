import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { calcReward, crashedGladiators, deathOrder, masterRewards, placingOrder, rankedResults, survival, trainingScores, xpToNextLevel } from '../../../helpers/battle-results.js';

const glads = pairs => pairs.map(([mmr, time]) => ({ mmr, time }));
/** A step of a group battle: each gladiator's name, master and hp. */
const step = (simtime, ...entries) => ({ simtime, glads: entries.map(([name, user, hp]) => ({ name, user, hp })) });

describe('battle results', () => {
    test('renown rewards match the PHP results on the same battles', () => {
        // golden values computed by battle_results.php calcReward()
        const cases = [
            [[[1200, 120], [1100, 90], [1300, 70], [1050, 50], [1150, 30]], [9.666666666666666, 3.0129870129870127, -0.8004926108374383, -3.879310344827586, -7.789408866995074]],
            [[[900, 200], [1500, 200], [700, 10], [300, 5]], [9.444444444444445, 5.666666666666667, -5.67533059735522, -1.0752393980848156]],
            [[[0, 100], [0, 80], [0, 60], [0, 40], [0, 20]], [10, 2.8571428571428568, 0, 0, 0]],
            [[[2000, 50.5], [400, 48.1]], [6, -1.3333333333333333]],
        ];
        for (const [battle, expected] of cases) {
            calcReward(glads(battle)).forEach((reward, index) => expect(reward).toBeCloseTo(expected[index], 10));
        }
    });

    test('a complete tie moves no renown', () => {
        expect(calcReward(glads([[0, 0], [0, 0], [0, 0]]))).toEqual([0, 0, 0]);
    });

    test('real delta logs keep the winner without hp on the last step and still produce wins', () => {
        // Built from real `data/runs/wp4fix3_*` engine output: the engine writes hp only when it
        // changes, so the winner has no hp in the final step. Run a 2-gladiator duel and a
        // 5-gladiator ranked battle with `Payload/socket_compile.sh`, then trim to name/user/hp.
        const duel = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../fixtures/simlog_duel_delta.json'), 'utf8'));
        const ranked = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../fixtures/simlog_ranked_delta.json'), 'utf8'));
        const duelOrder = deathOrder(duel);
        const rankedOrder = deathOrder(ranked);
        expect(duelOrder.some(entry => entry.hp > 0)).toBe(true);
        expect(rankedOrder.some(entry => entry.hp > 0)).toBe(true);
        // the raw last step carries no hp for the survivor(s), which is exactly the delta shape
        const duelWinner = duel[0].glads.findIndex(glad => glad.name === 'G0');
        const rankedWinner = ranked[0].glads.findIndex(glad => glad.name === 'G4');
        expect(duel.at(-1).glads[duelWinner].hp).toBeUndefined();
        expect(ranked.at(-1).glads[rankedWinner].hp).toBeUndefined();
        expect(rankedResults(duelOrder, true)).toEqual(['win', 'loss']);
        expect(rankedResults(rankedOrder, true)).toEqual(['win', 'loss', 'loss', 'loss', 'loss']);
    });

    test('the engine result makes no-survivor battles a draw and follows the equal-time win rule', () => {
        // playback shows "Empate" when the last step has no living gladiator
        expect(rankedResults([{ time: 90 }, { time: 50 }, { time: 10 }], false)).toEqual(['draw', 'draw', 'draw']);
        // calcReward treats first place and anyone who lasted as long as it as winners
        expect(rankedResults([{ time: 100 }, { time: 100 }, { time: 40 }], true)).toEqual(['win', 'win', 'loss']);
        expect(rankedResults([{ time: 100 }, { time: 99 }, { time: 40 }], true)).toEqual(['win', 'loss', 'loss']);
    });

    test('survivors place first, then the latest to die', () => {
        const order = deathOrder([
            { simtime: 0, glads: [{ name: 'A', user: 'u#1', hp: 10 }, { name: 'B', user: 'u2', hp: 10 }, { name: 'C', user: 'u3', hp: 10 }] },
            { simtime: 5, glads: [{ hp: 0 }, {}, { hp: 4 }] },
            { simtime: 9, glads: [{}, { hp: 0 }, {}] },
        ]);
        expect(order.map(glad => [glad.name, glad.user, glad.time])).toEqual([['C', 'u3', 5], ['B', 'u2', 9], ['A', 'u 1', 5]]);
    });

    test('masters earn silver and experience, more for a win and less after twenty battles', () => {
        const base = { mmr: 2215.87, level: 59, xp: 0, battlesToday: 0, gladiators: 5 };
        const win = masterRewards({ ...base, won: true });
        expect(win.silver).toBeCloseTo(373.1996, 4);
        expect(win.xp).toBe(250);
        expect(masterRewards({ ...base, won: true, battlesToday: 20 }).silver).toBeCloseTo(37.31996, 4);
        expect(masterRewards({ ...base, won: false }).silver).toBeCloseTo(45.53327, 4);
        expect(masterRewards({ ...base, mmr: 0, won: false }).silver).toBe(0);
    });

    test('a level is gained once the experience reaches the next level, never past 60', () => {
        const toNext = xpToNextLevel(1, 5);
        expect(toNext).toBeCloseTo(2.9 * 130, 6);
        expect(masterRewards({ mmr: 1000, level: 1, xp: toNext - 50, won: true, battlesToday: 0, gladiators: 5 })).toMatchObject({ level: 2, xp: 200 });
        expect(masterRewards({ mmr: 1000, level: 60, xp: 500, won: true, battlesToday: 0, gladiators: 5 })).toMatchObject({ level: 60, xp: 0 });
    });
    test('the winner places first, then the living, then the longest survivor', () => {
        const teams = [
            { team: 1, time: 50, hp: 0, dead: true },
            { team: 2, time: 1080, winner: true },
            { team: 3, time: 50, hp: 7 },
            { team: 4, time: 70, hp: 2 },
            { team: 5, time: 50, hp: 9 },
        ];
        expect(teams.sort(placingOrder).map(entry => entry.team)).toEqual([2, 4, 5, 3, 1]);
    });

    test('survival is when each gladiator was last alive, the winner after everyone', () => {
        const steps = [
            step(1, ['Zed', 'Ana', 30], ['Rex', 'Bo', 30], ['Max#II', 'Cy', 30]),
            step(2, ['Zed', 'Ana', 20], ['Rex', 'Bo', 4], ['Max#II', 'Cy', 0]),
            step(3, ['Zed', 'Ana', 15], ['Rex', 'Bo', 0], ['Max#II', 'Cy', 0]),
        ];
        expect(survival(steps)).toEqual([
            { name: 'Zed', user: 'Ana', time: 1003, hp: 0, winner: true },
            { name: 'Rex', user: 'Bo', time: 2, hp: 4 },
            { name: 'Max II', user: 'Cy', time: 1, hp: 30 },
        ]);
    });

    test('a training battle scores 10 for the winner and the others by how long they lasted', () => {
        const placed = [{ time: 1100, winner: true }, { time: 80 }, { time: 50 }, { time: 20 }];
        expect(trainingScores(placed)).toEqual([10, 6, 3, 0]);
        // a tie for the last place (or everyone dying together) scores everyone the most
        expect(trainingScores([{ time: 141.7 }, { time: 141.6 }])).toEqual([10, 10]);
        expect(trainingScores([{ time: 1030, winner: true }])).toEqual([10]);
        expect(trainingScores([{ time: 1050, winner: true }, { time: 1050, winner: true }, { time: 10 }])).toEqual([10, 10, 0]);
    });

    test('the engine flags crashed gladiators in its log', () => {
        // a real gladcode2-vm log: G0 (Python) raises NameError after simtime 3
        const log = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../fixtures/simlog_python_crash.json'), 'utf8'));
        expect(crashedGladiators(log)).toEqual([0]);

        const killed = [
            { simtime: 0.1, glads: [{ name: 'A', hp: 200, crashed: 0 }, { name: 'B', hp: 200, crashed: 0 }] },
            { simtime: 0.2, glads: [{ hp: 150 }, {}] },
            { simtime: 9, glads: [{ hp: 0 }, {}] },
        ];
        expect(crashedGladiators(killed)).toEqual([]);
        const firstStep = [{ simtime: 0.1, glads: [{ hp: 200, crashed: 0 }, { hp: 0, crashed: 1 }, { hp: 200, crashed: 1 }] }, { simtime: 0.2, glads: [{}, {}, {}] }];
        expect(crashedGladiators(firstStep)).toEqual([1, 2]);
        // logs from engines without the flag blame nobody
        expect(crashedGladiators([{ simtime: 0.1, glads: [{ hp: 200 }, { hp: 200 }] }])).toEqual([]);
    });

    test('entries beyond the battle size, forged through speak(), are ignored', () => {
        const injected = [
            { simtime: 0.1, glads: [{ hp: 200, crashed: 0 }, { hp: 200, crashed: 0 }] },
            { simtime: 1.1, glads: [{ message: 'a' }, { crashed: 1 }, { crashed: 1 }] },
        ];
        expect(crashedGladiators(injected)).toEqual([1]);
    });
});
