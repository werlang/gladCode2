// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/render2/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { images } from '../../web/public/script/helpers/sprite-catalog.js';
import {
    PREVIEW_MOVES, PREVIEW_REST_SECONDS, WALK_SPEED, assetNeeds, heldWeapon, previewFrame,
} from '../../web/public/script/render2/creator-pose.js';
import { getAppearance } from '../../web/public/script/render2/palette.js';
import { ACTION_SPECS, actionDuration } from '../../web/public/script/render2/motion.js';

const ANIMATED = ['cast', 'thrust', 'slash', 'shoot'];
const look = (tokens) => getAppearance(tokens, 0, new Map(), images);

test('walking moves the body at the walk speed, and pausing stands it on the first frame', () => {
    const walking = previewFrame({ move: 'walk', elapsed: 0.4, dt: 1 / 60, playing: true }).options.motion;
    assert.equal(walking.moveWeight, 1);
    assert.equal(walking.action, null);
    assert.equal(walking.combat, 0);
    assert.equal(walking.speed, WALK_SPEED);
    assert.ok(walking.travel > 0, 'a playing walk covers ground, so the stride advances');
    assert.equal(walking.phase, undefined, 'a playing walk keeps its own stride');

    const paused = previewFrame({ move: 'walk', elapsed: 0.4, dt: 1 / 60, playing: false }).options.motion;
    assert.equal(paused.phase, 0, 'paused: frame 0 of the walk, like the sprite');
    assert.equal(paused.dt, 0);
    assert.equal(paused.travel, 0);
    assert.equal(paused.moveWeight, 1, 'the walk stays a walk, so its legs are not dropped');
});

test('a paused action shows the guard stance, never a limb mid-swing', () => {
    for (const move of ANIMATED) {
        const motion = previewFrame({ move, elapsed: 0.2, dt: 1 / 60, playing: false }).options.motion;
        assert.equal(motion.action, null, move);
        assert.equal(motion.combat, 1, move);
        assert.equal(motion.moveWeight, 0, move);
    }
});

test('an action plays its own spec clock and blends in from the guard', () => {
    const spec = ACTION_SPECS.thrust;
    const { action } = previewFrame({ move: 'thrust', elapsed: 0.2, dt: 1 / 60, playing: true }).options.motion;
    assert.equal(action.style, 'thrust');
    assert.equal(action.time, 0.2);
    assert.equal(action.contact, spec.contact);
    assert.equal(action.fired, false, 'the bow is released by its contact time, as in the arena');
    assert.ok(action.blend > 0 && action.blend <= 1);
});

test('an action repeats after a short rest, and the rest holds the guard', () => {
    const spec = ACTION_SPECS.melee;
    const cycle = actionDuration(spec) + PREVIEW_REST_SECONDS;
    const during = previewFrame({ move: 'slash', elapsed: spec.duration + 0.2, dt: 0, playing: true }).options.motion;
    assert.equal(during.action, null, 'the rest between two repeats');
    assert.equal(during.combat, 1);
    const again = previewFrame({ move: 'slash', elapsed: cycle + 0.1, dt: 0, playing: true }).options.motion;
    assert.ok(Math.abs(again.action.time - 0.1) < 1e-9, 'the next repeat restarts at 0');
});

test('the shot is the arena bow action, aimed as the fighter aims it', () => {
    const frame = previewFrame({ move: 'shoot', elapsed: 0.3, dt: 0.016, playing: true });
    assert.equal(frame.options.motion.action.style, 'ranged');
    assert.equal(frame.options.aim, frame.options.motion.action.blend);
    assert.equal(PREVIEW_MOVES.shoot.style, 'ranged');
});

test('every move and time yields finite poses and motion values', () => {
    for (const move of Object.keys(PREVIEW_MOVES)) {
        for (let elapsed = 0; elapsed <= 3; elapsed += 0.05) {
            const { pose, options } = previewFrame({ move, elapsed, dt: 1 / 60, playing: true, turn: 0.4 });
            for (const [key, value] of Object.entries(pose)) assert.ok(Number.isFinite(value), `${move} ${key} at ${elapsed}`);
            for (const [key, value] of Object.entries(options.motion)) {
                if (typeof value === 'number') assert.ok(Number.isFinite(value), `${move} motion.${key} at ${elapsed}`);
            }
        }
    }
});

test('the turn clips play only for a real yaw change', () => {
    assert.equal(previewFrame({ turn: 0.004 }).options.motion.turn, 0);
    assert.equal(previewFrame({ turn: 1.2 }).options.motion.turn, 1.2);
    assert.equal(previewFrame({ turn: -1.2 }).options.motion.turn, -1.2);
});

test('the held weapon follows the move: the bow for the shot, otherwise the worn melee weapon, else the bow, else none', () => {
    assert.equal(heldWeapon('shoot', true, true), 'bow');
    assert.equal(heldWeapon('slash', true, true), 'melee');
    assert.equal(heldWeapon('walk', false, true), 'bow');
    assert.equal(heldWeapon('walk', false, false), 'none', 'a gladiator with no weapon shows none');
    assert.equal(heldWeapon('cast', false, false), 'none');
});

test('a gladiator needs its gender, weapon, bow, shield and props from Synty', () => {
    const plain = assetNeeds(look(['female', 'female-light']));
    assert.ok(plain.includes('gender:Femn'));
    assert.ok(plain.includes('weapon:sword'), 'no melee layer: the default sword is the stand-in');
    assert.ok(plain.includes('bow:bow'));
    assert.ok(!plain.some((need) => need.startsWith('shield:')));

    const armed = assetNeeds(look(['male', 'male-light', 'male_sword', 'bow', 'male_shield_1']));
    assert.ok(armed.includes('gender:Masc'));
    assert.ok(armed.includes('shield:heater'));
    assert.ok(armed.includes('weapon:sword'));
});
