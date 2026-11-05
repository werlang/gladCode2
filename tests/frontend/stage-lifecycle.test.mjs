// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/stage-lifecycle.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { STAGE_STATUS, StageLifecycle } from '../../web/public/script/helpers/stage-lifecycle.js';

/** Lets every pending promise callback run. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * A lifecycle over fake browser parts: views count as live WebGL contexts until released, stages record what they
 * were asked to do. `createStage` waits for `gate` when one is given.
 */
function harness({ webgl = true, threeFails = false, showFails = false, gate = null } = {}) {
    const views = [];
    const stages = [];
    const changes = [];
    const warnings = [];
    const lifecycle = new StageLifecycle({
        openView: async () => {
            if (!webgl) return null;
            const view = { releases: 0, release() { this.releases += 1; } };
            views.push(view);
            return view;
        },
        createStage: async view => {
            if (gate) await gate;
            if (threeFails) throw new Error('three did not load');
            const stage = {
                view, shows: [], starts: 0, stops: 0, disposals: 0, move: null, playing: null,
                show: async skin => {
                    stage.shows.push(skin);
                    if (showFails) throw new Error('Synty asset missing');
                    return true;
                },
                setMove: move => { stage.move = move; },
                setPlaying: playing => { stage.playing = playing; },
                start: () => { stage.starts += 1; },
                stop: () => { stage.stops += 1; },
                dispose: () => { stage.disposals += 1; },
            };
            stages.push(stage);
            return stage;
        },
        onChange: change => changes.push(change),
        warn: (message, error) => warnings.push(String(error?.message ?? error)),
    });
    const live = () => views.filter(view => view.releases === 0).length;
    return { lifecycle, views, stages, changes, warnings, live };
}

test('nothing loads until the view is on screen, then the gladiator shows', async () => {
    const { lifecycle, views, stages, changes } = harness();
    lifecycle.setSkin(['male', 'male-light']);
    lifecycle.setMove('shoot');
    await settle();
    assert.equal(views.length, 0);
    assert.equal(lifecycle.state, 'idle');
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'ready');
    assert.deepEqual(changes.map(change => change.state), ['loading', 'ready']);
    assert.equal(changes[0].status, STAGE_STATUS.loading);
    assert.equal(lifecycle.status, '');
    assert.deepEqual(stages[0].shows, [['male', 'male-light']]);
    assert.equal(stages[0].move, 'shoot');
    assert.equal(stages[0].starts, 1);
});

test('without WebGL the sprite stays with its status and no stage is built', async () => {
    const { lifecycle, stages } = harness({ webgl: false });
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'failed');
    assert.equal(lifecycle.status, STAGE_STATUS.noWebgl);
    assert.equal(stages.length, 0);
});

test('when three or the stage fails, the opened context is released', async () => {
    const { lifecycle, live, views, warnings } = harness({ threeFails: true });
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'failed');
    assert.equal(lifecycle.status, STAGE_STATUS.failed);
    assert.equal(views.length, 1);
    assert.equal(live(), 0);
    assert.deepEqual(warnings, ['three did not load']);
});

test('missing models fail the view: status, stage disposed, context released', async () => {
    const { lifecycle, stages, live } = harness({ showFails: true });
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'failed');
    assert.equal(lifecycle.status, STAGE_STATUS.failed);
    assert.equal(stages[0].disposals, 1);
    assert.equal(live(), 0);
    // a failed visit stays failed, even when the page is hidden and shown again
    lifecycle.release();
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'failed');
    assert.equal(stages.length, 1);
});

test('hiding stops the stage, showing resumes it with the skin changed meanwhile', async () => {
    const { lifecycle, stages } = harness();
    lifecycle.setSkin(['male']);
    lifecycle.setVisible(true);
    await settle();
    const [stage] = stages;
    lifecycle.setVisible(false);
    assert.equal(stage.stops, 1);
    lifecycle.setSkin(['female']);
    await settle();
    assert.equal(stage.shows.length, 1, 'no rebuild while hidden');
    lifecycle.setVisible(true);
    await settle();
    assert.equal(stage.starts, 2);
    assert.deepEqual(stage.shows.at(-1), ['female']);
});

test('leaving the page releases the context; a restored page loads again', async () => {
    const { lifecycle, stages, views, live } = harness();
    lifecycle.setVisible(true);
    await settle();
    lifecycle.release();
    assert.equal(lifecycle.state, 'idle');
    assert.equal(stages[0].disposals, 1);
    assert.equal(live(), 0);
    lifecycle.setVisible(true);
    await settle();
    assert.equal(lifecycle.state, 'ready');
    assert.equal(views.length, 2);
    assert.equal(live(), 1);
});

test('a stage that arrives after the page was left is disposed with its context', async () => {
    let open;
    const gate = new Promise(resolve => { open = resolve; });
    const { lifecycle, stages, live } = harness({ gate });
    lifecycle.setVisible(true);
    await settle();
    lifecycle.release();
    open();
    await settle();
    assert.equal(stages[0].disposals, 1);
    assert.equal(live(), 0);
    assert.equal(lifecycle.state, 'idle');
});

test('a lost context fails the view; the loss of a view already let go is ignored', async () => {
    const { lifecycle, views, live } = harness();
    lifecycle.setVisible(true);
    await settle();
    lifecycle.lost({ release() {} });
    assert.equal(lifecycle.state, 'ready');
    lifecycle.lost(views[0]);
    assert.equal(lifecycle.state, 'failed');
    assert.equal(live(), 0);
});
