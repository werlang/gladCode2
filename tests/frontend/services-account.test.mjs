// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-account.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { AccountService } = await import('../../web/public/script/services/account.js');

/** A deferred the test resolves when it wants the request to finish. */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

/** A UserModel double: records bodies and lets the test hold each update. */
class FakeModel {
    constructor(user) {
        this.user = user;
        this.bodies = [];
        this.gates = [];
        this.failures = [];
        this.signOutGate = null;
        this.signOutFailure = null;
        this.signOutCalls = 0;
    }

    async current() {
        return this.user;
    }

    async update(body) {
        this.bodies.push(body);
        const gate = this.gates.shift();
        if (gate) await gate.promise;
        const failure = this.failures.shift();
        if (failure) throw failure;
        this.user = { ...this.user, ...body };
        return this.user;
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

function make(user = { id: 1, nickname: 'Spartacus_C', theme: 'system', gladView: '3d' }) {
    const model = new FakeModel(user);
    const bus = fakeBus();
    return { model, bus, service: new AccountService({ model, bus }) };
}

test('load() publishes the account and seeds each field with its confirmed value', async () => {
    const { bus, service, model } = make();
    const user = await service.load();

    assert.equal(user.nickname, 'Spartacus_C');
    assert.deepEqual(bus.emitted, [{ name: 'account:loaded', detail: { user } }]);
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(model.bodies.length, 0);
});

test('two rapid changes to one field: the last intent wins and the first response is superseded', async () => {
    const { service, model, bus } = make();
    await service.load();
    const firstGate = deferred();
    const secondGate = deferred();
    model.gates.push(firstGate, secondGate);

    const first = service.save('theme', 'classic');
    const second = service.save('theme', 'arena-dark');
    firstGate.resolve();
    const firstResult = await first;
    await Promise.resolve();
    assert.equal(model.bodies.length, 2);
    secondGate.resolve();
    const secondResult = await second;

    assert.equal(firstResult.superseded, true);
    assert.equal(secondResult.superseded, undefined);
    assert.equal(secondResult.user.theme, 'arena-dark');
    assert.equal(model.bodies.length, 2);
    assert.deepEqual(model.bodies.map(body => body.theme), ['classic', 'arena-dark']);
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 1);
    assert.equal(secondResult.token.field, 'theme');
    assert.equal(service.user.theme, 'arena-dark');
});

test('a superseded success updates the rollback base without emitting account:saved', async () => {
    const { service, model, bus } = make();
    await service.load();
    const gate = deferred();
    const secondGate = deferred();
    model.gates.push(gate, secondGate);

    const first = service.save('theme', 'classic');
    const second = service.save('theme', 'arena-dark');
    gate.resolve();
    const result = await first;
    await Promise.resolve();

    assert.equal(result.superseded, true);
    assert.equal(service.confirmed('theme'), 'classic');
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 0);
    assert.equal(service.isCurrent(result.token), false);
    // the queued second write is still sent after the first settles
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(model.bodies.length, 2);
    secondGate.resolve();
    const secondResult = await second;
    assert.equal(secondResult.user.theme, 'arena-dark');
    assert.equal(service.confirmed('theme'), 'arena-dark');
});

test('undo restores the value captured before the change and saves it through the same queue', async () => {
    const { service, model } = make({ id: 1, theme: 'system' });
    await service.load();

    const saved = await service.save('theme', 'classic');
    assert.equal(saved.token.previous, 'system');
    assert.equal(service.confirmed('theme'), 'classic');

    const undone = await service.undo(saved.token);
    assert.equal(undone.user.theme, 'system');
    assert.deepEqual(model.bodies.map(body => body.theme), ['classic', 'system']);
    assert.equal(service.confirmed('theme'), 'system');
});

test('undo targets the token field: two fields at revision 1 undo independently', async () => {
    const { service, model } = make({ id: 1, theme: 'system', gladView: '3d' });
    await service.load();

    const theme = await service.save('theme', 'classic');
    const gladView = await service.save('gladView', 'sprite');
    assert.equal(theme.token.rev, 1);
    assert.equal(gladView.token.rev, 1);

    const undoneTheme = await service.undo(theme.token);
    assert.equal(undoneTheme.user.theme, 'system');
    assert.equal(service.isCurrent(gladView.token), true);

    const undoneGladView = await service.undo(gladView.token);
    assert.equal(undoneGladView.user.gladView, '3d');
    assert.deepEqual(model.bodies, [{ theme: 'classic' }, { gladView: 'sprite' }, { theme: 'system' }, { gladView: '3d' }]);
});

test('a later change to the same field invalidates the older undo; another field does not', async () => {
    const { service } = make({ id: 1, theme: 'system', gladView: '3d' });
    await service.load();

    const first = await service.save('theme', 'classic');
    const second = await service.save('theme', 'arena-dark');
    assert.equal(service.isCurrent(first.token), false);
    assert.deepEqual(await service.undo(first.token), { ignored: true });

    const other = await service.save('gladView', 'sprite');
    assert.equal(service.isCurrent(second.token), true);
    assert.equal(service.isCurrent(other.token), true);
});

test('the current revision failure rejects and leaves the confirmed value for rollback', async () => {
    const { service, model } = make({ id: 1, theme: 'system' });
    await service.load();
    const failure = new Error('refused');
    model.failures.push(failure);

    await assert.rejects(service.save('theme', 'classic'), /refused/);
    assert.equal(service.confirmed('theme'), 'system');
    assert.equal(service.user.theme, 'system');
});

test('setSilver updates the account and emits the balance; signOut clears the state', async () => {
    const { service, bus, model } = make();
    await service.load();
    service.setSilver(1200);
    assert.equal(service.user.silver, 1200);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:silver', detail: { silver: 1200 } });

    await service.signOut();
    assert.equal(service.user, null);
    assert.equal(model.user, null);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('a write that finishes after signOut cannot restore the account', async () => {
    const { service, model, bus } = make();
    await service.load();
    const gate = deferred();
    model.gates.push(gate);

    const inFlight = service.save('theme', 'classic');
    const pending = service.save('theme', 'arena-dark');
    await service.signOut();
    gate.resolve();

    const first = await inFlight;
    const second = await pending;
    assert.equal(first.superseded, true);
    assert.equal(first.signedOut, true);
    assert.equal(second.signedOut, true);
    assert.equal(service.user, null);
    assert.equal(bus.emitted.filter(event => event.name === 'account:saved').length, 0);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('signOut invalidates the queue before the session request finishes', async () => {
    const { service, model, bus } = make();
    await service.load();
    const updateGate = deferred();
    model.gates.push(updateGate);
    const inFlight = service.save('theme', 'classic');

    const signOutGate = deferred();
    model.signOutGate = signOutGate;
    const signingOut = service.signOut();
    updateGate.resolve();

    const result = await inFlight;
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
    const updateGate = deferred();
    model.gates.push(updateGate);
    const inFlight = service.save('theme', 'classic');

    model.signOutFailure = new Error('network down');
    await assert.rejects(service.signOut(), /network down/);

    assert.equal(service.user.id, 1);
    assert.equal(model.user.id, 1);
    assert.equal(bus.emitted.some(event => event.name === 'account:signed-out'), false);
    assert.equal(bus.emitted.at(-1).name, 'account:sign-out-failed');
    assert.equal(bus.emitted.at(-1).detail.error.message, 'network down');

    const queued = service.save('theme', 'arena-dark');
    updateGate.resolve();
    const first = await inFlight;
    const second = await queued;
    assert.equal(first.signedOut, true);
    assert.equal(second.user.theme, 'arena-dark');
    assert.equal(service.user.theme, 'arena-dark');

    model.signOutFailure = null;
    await service.signOut();
    assert.equal(service.user, null);
    assert.equal(model.user, null);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});

test('a save during signOut is refused and concurrent signOut calls share the request', async () => {
    const { service, model, bus } = make();
    await service.load();
    const signOutGate = deferred();
    model.signOutGate = signOutGate;

    const first = service.signOut();
    const second = service.signOut();
    assert.equal(model.signOutCalls, 1);

    const during = await service.save('theme', 'classic');
    assert.equal(during.superseded, true);
    assert.equal(during.signedOut, true);
    assert.equal(model.bodies.length, 0);

    signOutGate.resolve();
    await Promise.all([first, second]);
    assert.equal(service.user, null);
    assert.equal(model.user, null);
    assert.deepEqual(bus.emitted.at(-1), { name: 'account:signed-out', detail: {} });
});
