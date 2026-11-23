// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-account.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { AccountService } = await import('../../web/public/script/services/account.js');

/** A deferred the test resolves when the request should finish. */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

/** Applies one API body to the fake account (preferences travel as one-key patches). */
function applyBody(user, body) {
    if (body.preferences) return { ...user, preferences: { ...(user.preferences ?? {}), ...body.preferences } };
    return { ...user, ...body };
}

/** A UserModel double: every update waits for its own gate. */
class FakeModel {
    constructor(user) {
        this.user = user;
        this.calls = [];
        this.signOutGate = null;
        this.signOutFailure = null;
        this.signOutCalls = 0;
    }

    async current() {
        return this.user;
    }

    update(body) {
        const call = { body, gate: deferred(), failure: null };
        this.calls.push(call);
        return call.gate.promise.then(() => {
            if (call.failure) throw call.failure;
            this.user = applyBody(this.user, body);
            return this.user;
        });
    }

    async signOut() {
        this.signOutCalls += 1;
        if (this.signOutGate) await this.signOutGate.promise;
        if (this.signOutFailure) throw this.signOutFailure;
        this.user = null;
    }
}

/** A bus double. */
function fakeBus() {
    const emitted = [];
    return {
        emitted,
        emit(name, detail) {
            emitted.push({ name, detail });
        },
    };
}

function make(user = { id: 1, nickname: 'Spartacus_C', language: 'c', theme: 'system', gladView: '3d' }) {
    const model = new FakeModel({ preferences: { message: true, friend: true, update: true, duel: true, tourn: true }, ...user });
    const bus = fakeBus();
    return { model, bus, service: new AccountService({ model, bus }) };
}

/** Resolves the request a test is holding, optionally refusing it. */
async function settle(call, failure = null) {
    call.failure = failure;
    call.gate.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
}

test('load() publishes the account and seeds each field with its confirmed value', async () => {
    const { bus, service, model } = make();
    const user = await service.load();

    assert.equal(user.nickname, 'Spartacus_C');
    assert.deepEqual(bus.emitted, [{ name: 'account:loaded', detail: { user } }]);
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(service.confirmed('preferences.message'), true);
    assert.equal(model.calls.length, 0);
});

test('two fields changed quickly are independent and both persist', async () => {
    const { service, model } = make();
    await service.load();

    const theme = service.save('theme', 'classic');
    const gladView = service.save('gladView', 'sprite');
    assert.equal(model.calls.length, 2);
    assert.deepEqual(model.calls[0].body, { theme: 'classic' });
    assert.deepEqual(model.calls[1].body, { gladView: 'sprite' });

    await settle(model.calls[0]);
    await settle(model.calls[1]);
    assert.equal((await theme).status, 'saved');
    assert.equal((await gladView).status, 'saved');
    assert.equal(service.confirmed('theme'), 'classic');
    assert.equal(service.confirmed('gladView'), 'sprite');
});

test('the latest intent of one field wins while the first request is in flight', async () => {
    const { service, model, bus } = make();
    await service.load();

    const first = service.save('theme', 'classic');
    const second = service.save('theme', 'arena-dark');
    assert.equal(model.calls.length, 1);

    await settle(model.calls[0]);
    const firstResult = await first;
    assert.equal(firstResult.status, 'superseded');
    assert.equal(model.calls.length, 2);
    assert.deepEqual(model.calls[1].body, { theme: 'arena-dark' });

    await settle(model.calls[1]);
    const secondResult = await second;
    assert.equal(secondResult.status, 'saved');
    assert.equal(service.confirmed('theme'), 'arena-dark');
    // the server accepted both values; the shell sees the latest one
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 2);
});

test('reverting to the confirmed value while a write is in flight sends the revert', async () => {
    const { service, model } = make();
    await service.load();

    const forward = service.save('theme', 'classic');
    const back = service.save('theme', 'system');
    assert.equal(model.calls.length, 1);
    await settle(model.calls[0]);
    assert.equal((await forward).status, 'superseded');
    assert.equal(model.calls.length, 2);
    assert.deepEqual(model.calls[1].body, { theme: 'system' });
    await settle(model.calls[1]);
    assert.equal((await back).status, 'saved');
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(service.busy('theme'), false);
});

test('a refused latest intent rolls back and sends no retry', async () => {
    const { service, model, bus } = make();
    await service.load();

    const refused = service.save('theme', 'classic');
    await settle(model.calls[0], Object.assign(new Error('refused'), { code: 'REFUSED' }));
    const result = await refused;

    assert.equal(result.status, 'refused');
    assert.equal(result.error.message, 'refused');
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 0);

    // a later explicit change still works
    const next = service.save('theme', 'arena-dark');
    assert.equal(model.calls.length, 2);
    await settle(model.calls[1]);
    assert.equal((await next).status, 'saved');
});

test('a refused older intent is dropped silently and the newer intent continues', async () => {
    const { service, model } = make();
    await service.load();

    const older = service.save('theme', 'classic');
    const newer = service.save('theme', 'arena-dark');
    await settle(model.calls[0], new Error('older refused'));

    const olderResult = await older;
    assert.equal(olderResult.status, 'superseded');
    assert.equal(model.calls.length, 2);
    assert.deepEqual(model.calls[1].body, { theme: 'arena-dark' });

    await settle(model.calls[1]);
    assert.equal((await newer).status, 'saved');
    assert.equal(service.confirmed('theme'), 'arena-dark');
});

test('a refusal in one field does not disturb a request in another', async () => {
    const { service, model } = make();
    await service.load();

    const theme = service.save('theme', 'classic');
    const gladView = service.save('gladView', 'sprite');
    await settle(model.calls[0], new Error('theme refused'));
    const themeResult = await theme;
    assert.equal(themeResult.status, 'refused');
    assert.equal(service.confirmed('theme'), 'system');

    await settle(model.calls[1]);
    assert.equal((await gladView).status, 'saved');
    assert.equal(service.confirmed('gladView'), 'sprite');
});

test('undo is a normal change of each field and leaves the other field alone', async () => {
    const { service, model } = make();
    await service.load();

    const theme = service.save('theme', 'classic');
    await settle(model.calls[0]);
    const themeResult = await theme;
    const glad = service.save('gladView', 'sprite');
    await settle(model.calls[1]);
    const gladResult = await glad;

    assert.equal(themeResult.before, 'system');
    assert.equal(gladResult.before, '3d');

    const undoTheme = service.save('theme', themeResult.before);
    await settle(model.calls[2]);
    assert.equal((await undoTheme).status, 'saved');
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(service.confirmed('gladView'), 'sprite');

    const undoGlad = service.save('gladView', gladResult.before);
    await settle(model.calls[3]);
    assert.equal((await undoGlad).status, 'saved');
    assert.equal(service.confirmed('gladView'), '3d');
});

test('a refused undo keeps the last confirmed value', async () => {
    const { service, model } = make();
    await service.load();

    const saved = service.save('theme', 'classic');
    await settle(model.calls[0]);
    const savedResult = await saved;
    assert.equal(service.confirmed('theme'), 'classic');

    const undo = service.save('theme', savedResult.before);
    await settle(model.calls[1], new Error('undo refused'));
    const undoResult = await undo;
    assert.equal(undoResult.status, 'refused');
    assert.equal(service.confirmed('theme'), 'classic');
});

test('preferences are independent per switch and undo only the switch named', async () => {
    const { service, model } = make({ id: 1, preferences: { message: true, friend: true, update: true, duel: true, tourn: true } });
    await service.load();

    const message = service.save('preferences.message', false);
    const duel = service.save('preferences.duel', false);
    assert.deepEqual(model.calls[0].body, { preferences: { message: false } });
    assert.deepEqual(model.calls[1].body, { preferences: { duel: false } });

    await settle(model.calls[0]);
    await settle(model.calls[1]);
    assert.equal((await message).status, 'saved');
    assert.equal((await duel).status, 'saved');
    assert.equal(service.confirmed('preferences.message'), false);
    assert.equal(service.confirmed('preferences.duel'), false);

    const undoMessage = service.save('preferences.message', true);
    await settle(model.calls[2]);
    assert.equal((await undoMessage).status, 'saved');
    assert.equal(service.confirmed('preferences.message'), true);
    assert.equal(service.confirmed('preferences.duel'), false);
});

test('a refused switch does not supersede another switch in flight', async () => {
    const { service, model } = make({ id: 1, preferences: { message: true, friend: true, update: true, duel: true, tourn: true } });
    await service.load();

    const message = service.save('preferences.message', false);
    const duel = service.save('preferences.duel', false);
    await settle(model.calls[0], new Error('message refused'));
    assert.equal((await message).status, 'refused');
    assert.equal(service.confirmed('preferences.message'), true);

    await settle(model.calls[1]);
    assert.equal((await duel).status, 'saved');
    assert.equal(service.confirmed('preferences.duel'), false);
});

test('the same intent is sent once and the duplicate wait resolves with it', async () => {
    const { service, model } = make();
    await service.load();

    const first = service.save('theme', 'classic');
    const second = service.save('theme', 'classic');
    assert.equal(first, second);
    assert.equal(model.calls.length, 1);
    await settle(model.calls[0]);
    assert.equal((await first).status, 'saved');
    assert.equal((await second).status, 'saved');
});

test('saving the confirmed value is a no-op with no request', async () => {
    const { service, model } = make();
    await service.load();
    const result = await service.save('theme', 'system');
    assert.equal(result.status, 'saved');
    assert.equal(result.unchanged, true);
    assert.equal(model.calls.length, 0);
});

test('a write that finishes after signOut cannot restore the account', async () => {
    const { service, model, bus } = make();
    await service.load();
    const theme = service.save('theme', 'classic');
    const glad = service.save('gladView', 'sprite');

    await service.signOut();
    const themeResult = await theme;
    const gladResult = await glad;
    assert.equal(themeResult.signedOut, true);
    assert.equal(gladResult.signedOut, true);
    assert.equal(service.user, null);
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 0);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('signOut invalidates the queue before the session request finishes', async () => {
    const { service, model, bus } = make();
    await service.load();
    const theme = service.save('theme', 'classic');
    const signOutGate = deferred();
    model.signOutGate = signOutGate;
    const signingOut = service.signOut();

    const result = await theme;
    assert.equal(result.signedOut, true);
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 0);
    assert.equal(bus.emitted.some(event => event.name === 'account:signed-out'), false);

    signOutGate.resolve();
    await signingOut;
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('a refused signOut keeps the account and a new save still drains', async () => {
    const { service, model, bus } = make();
    await service.load();
    const inFlight = service.save('theme', 'classic');
    model.signOutFailure = new Error('network down');
    await assert.rejects(service.signOut(), /network down/);

    assert.equal(service.user.id, 1);
    assert.equal(service.user.theme, 'system');
    assert.equal(bus.emitted.filter(event => event.name === 'account:signed-out').length, 0);
    assert.equal(bus.emitted.at(-1).name, 'account:sign-out-failed');

    // the old request may still settle, but its result is no longer current
    await settle(model.calls[0]);
    assert.equal((await inFlight).signedOut, true);
    const queued = service.save('theme', 'arena-dark');
    await settle(model.calls[1]);
    const saved = await queued;
    assert.equal(saved.status, 'saved');
    assert.equal(service.user.theme, 'arena-dark');

    model.signOutFailure = null;
    await service.signOut();
    assert.equal(service.user, null);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('a save during signOut is refused and concurrent signOut calls share the request', async () => {
    const { service, model } = make();
    await service.load();
    const signOutGate = deferred();
    model.signOutGate = signOutGate;

    const first = service.signOut();
    const second = service.signOut();
    assert.equal(model.signOutCalls, 1);

    const during = await service.save('theme', 'classic');
    assert.equal(during.status, 'superseded');
    assert.equal(during.signedOut, true);
    assert.equal(model.calls.length, 0);

    signOutGate.resolve();
    await Promise.all([first, second]);
    assert.equal(service.user, null);
});
