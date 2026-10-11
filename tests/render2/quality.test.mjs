import assert from 'node:assert/strict';
import test from 'node:test';

import { QUALITY_TIERS, chooseQuality } from '../../public_html/script/render2/quality.js';
import { glide } from '../../public_html/script/render2/audio-param.js';

test('the automatic tier follows the device, and a stored choice wins', () => {
    const desktop = { mobile: false, cores: 10, memory: 8 };
    assert.equal(chooseQuality('auto', desktop), 'high');
    assert.equal(chooseQuality(null, { mobile: false, cores: 4, memory: 8 }), 'medium');
    assert.equal(chooseQuality('auto', { mobile: true, cores: 8, memory: 6 }), 'medium');
    assert.equal(chooseQuality('auto', { mobile: true, cores: 4, memory: 4 }), 'low');
    assert.equal(chooseQuality('low', desktop), 'low');
    assert.equal(chooseQuality('nonsense', desktop), 'high');
});

test('lower tiers never ask for more than higher ones', () => {
    const order = ['high', 'medium', 'low'].map((name) => QUALITY_TIERS[name]);
    for (let i = 1; i < order.length; i += 1) {
        assert.ok(order[i].pixelRatio <= order[i - 1].pixelRatio);
        assert.ok(order[i].crowd <= order[i - 1].crowd);
    }
});

test('glide skips automation calls that would not change the target', () => {
    const calls = [];
    const param = { setTargetAtTime: (value) => calls.push(value) };
    assert.equal(glide(param, 1, 0, 0.1), true);
    assert.equal(glide(param, 1.0005, 0.016, 0.1), false);
    assert.equal(glide(param, 2, 0.033, 0.1), true);
    assert.equal(glide(param, 2.04, 0.05, 0.1, 0.05), false);
    assert.deepEqual(calls, [1, 2]);
});
