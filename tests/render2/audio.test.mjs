import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { SOUNDS, measureSound, potionSound } from '../../public_html/script/render2/audio-manager.js';
import { crackleSamples, seededRandom } from '../../public_html/script/render2/soundscape.js';
import { COUGH_INTERVAL, deriveStepEvents } from '../../public_html/script/render2/battle-state.js';

const RATE = 8000;

/** A tone of `seconds` at `amplitude`, after `lead` seconds of silence. */
function tone(seconds, amplitude, lead = 0) {
    const data = new Float32Array(Math.round((lead + seconds) * RATE));
    for (let i = Math.round(lead * RATE); i < data.length; i += 1) data[i] = amplitude * Math.sin(i * 0.3);
    return data;
}

test('measureSound skips leading silence to the attack', () => {
    const { offset } = measureSound([tone(0.5, 0.5, 0.2)], RATE);
    assert.ok(offset > 0.19 && offset <= 0.2, `offset ${offset}`);
    assert.equal(measureSound([tone(0.5, 0.5)], RATE).offset, 0);
});

test('measureSound reads loudness as short-term RMS, so a brief click counts quieter than a held tone', () => {
    const held = measureSound([tone(1, 0.5)], RATE).loudness;
    // A sine of amplitude 0.5 has an RMS of 0.5/sqrt(2): about -9 dBFS.
    assert.ok(Math.abs(held - 20 * Math.log10(0.5 / Math.SQRT2)) < 0.3, `held ${held}`);
    const click = measureSound([tone(0.03, 0.5)], RATE).loudness;
    assert.ok(click < held - 8, `click ${click} vs held ${held}`);
    // Silence never divides by zero.
    assert.equal(measureSound([new Float32Array(100)], RATE).loudness, -Infinity);
});

test('measureSound averages the channels of a stereo file', () => {
    const left = tone(1, 0.5);
    const right = new Float32Array(left.length);
    const stereo = measureSound([left, right], RATE).loudness;
    const mono = measureSound([left], RATE).loudness;
    assert.ok(Math.abs(stereo - (mono - 3.01)) < 0.1);
});

test('potions play the classic renderer sound for their kind', () => {
    assert.equal(potionSound('potion-hp'), 'heal');
    assert.equal(potionSound('potion-ap'), 'mana');
    assert.equal(potionSound('potion-high'), 'tonic');
    assert.equal(potionSound('potion-low'), 'tonic');
    assert.equal(potionSound('potion-xp'), 'elixir');
    assert.equal(potionSound(undefined), 'elixir');
});

test('every sound has files on disk and a level within the mix range', () => {
    for (const [name, sound] of Object.entries(SOUNDS)) {
        assert.ok(sound.files.length > 0, name);
        for (const path of sound.files) assert.ok(existsSync(new URL(`../../public_html/${path}`, import.meta.url)), path);
        assert.ok(Math.abs(sound.level) <= 18, name);
    }
});

test('the synthesised fire crackle is deterministic, normalised and seamless', () => {
    const a = crackleSamples(RATE, 2, seededRandom(3));
    const b = crackleSamples(RATE, 2, seededRandom(3));
    assert.deepEqual(a, b);
    assert.equal(a.length, 2 * RATE);
    let peak = 0;
    for (const value of a) peak = Math.max(peak, Math.abs(value));
    assert.ok(Math.abs(peak - 0.9) < 1e-6);
    // The jump across the loop point is no bigger than the signal's typical sample-to-sample step.
    let steps = 0;
    for (let i = 1; i < a.length; i += 1) steps += Math.abs(a[i] - a[i - 1]);
    const typical = steps / (a.length - 1);
    assert.ok(Math.abs(a[0] - a[a.length - 1]) < typical * 8);
});

test('seededRandom stays in [0, 1)', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 1000; i += 1) {
        const value = random();
        assert.ok(value >= 0 && value < 1);
    }
});

test('a stun is an event only when it begins', () => {
    const frame = (stun, hp = 100) => ({ glads: [{ id: 0, hp, lvl: 1, action: 0, buffs: { stun: { timeleft: stun } } }], projectiles: [] });
    assert.deepEqual(deriveStepEvents(frame(0), frame(1.5)).filter((event) => event.type === 'stun'), [{ type: 'stun', gladId: 0 }]);
    assert.equal(deriveStepEvents(frame(1.5), frame(1.4)).filter((event) => event.type === 'stun').length, 0);
    assert.equal(deriveStepEvents(frame(0, 0), frame(1.5, 0)).filter((event) => event.type === 'stun').length, 0);
});

test('a gladiator in the gas coughs on stepping in, then on its own beat while it stays', () => {
    // Arena centre is (12.5, 12.5); a safe radius of 5 leaves x = 20 in the gas and x = 12.5 safe.
    const frame = (simtime, x, hp = 100) => ({ simtime, poison: 5, glads: [{ id: 0, hp, lvl: 1, action: 0, x, y: 12.5 }], projectiles: [] });
    const coughs = (previous, current) => deriveStepEvents(previous, current).filter((event) => event.type === 'cough');
    assert.deepEqual(coughs(frame(1, 12.5), frame(1.1, 20)), [{ type: 'cough', gladId: 0 }]);
    assert.equal(coughs(frame(1.1, 20), frame(1.2, 20)).length, 0);
    assert.equal(coughs(frame(COUGH_INTERVAL - 0.1, 20), frame(COUGH_INTERVAL, 20)).length, 1);
    assert.equal(coughs(frame(1, 20), frame(1.1, 12.5)).length, 0);
    assert.equal(coughs(frame(1, 12.5), frame(1.1, 20, 0)).length, 0);
});
