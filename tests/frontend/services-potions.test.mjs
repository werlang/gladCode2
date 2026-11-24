// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-potions.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { PotionsService, normalizeSlots } = await import('../../web/public/script/services/potions.js');
const { RequestError } = await import('../../web/public/script/helpers/request.js');

const SLOTS = {
    serverNow: '2026-01-01 10:00:00',
    level: 4,
    unlockLevels: [1, 10, 20, 30],
    slots: [
        { id: 1, identifier: 'hp3', name: 'Vida III', icon: 'hp', expiresAt: '2026-01-01 10:03:00', seconds: 180 },
        { id: 2, identifier: 'ap2', name: 'Habilidade II', icon: 'ap', expiresAt: '2026-01-01 10:01:00', seconds: 60 },
    ],
};
const COUNTS = { user: { level: 23, xp: 120, silver: 1250 } };

function fakeBus() {
    const emitted = [];
    return {
        emitted,
        emit(name, detail) {
            emitted.push({ name, detail });
        },
    };
}

function modelWith({ buy } = {}) {
    const calls = { slots: 0, buy: [], cancel: [] };
    return {
        calls,
        async slots() {
            calls.slots += 1;
            return SLOTS;
        },
        async buy(identifier) {
            calls.buy.push(identifier);
            return buy ? buy(identifier) : { slotId: 3, silver: 1200 };
        },
        async cancel(id) {
            calls.cancel.push(id);
            return { cancelled: true };
        },
    };
}

test('normalizeSlots keeps the server timestamps and falls back to the seconds', () => {
    const state = normalizeSlots({
        serverNow: '2026-01-01 10:00:00',
        slots: [{ id: 1, identifier: 'hp3', name: 'Vida III', icon: 'hp', seconds: 90 }],
    });
    assert.equal(state.serverNow, '2026-01-01 10:00:00');
    assert.equal(state.slots[0].expiresAt, '2026-01-01 10:01:30');
});

test('a 201 with slots applies the balance and the list directly, with no read', async () => {
    const bus = fakeBus();
    const model = modelWith({
        buy: () => ({
            slotId: 3,
            silver: 1200,
            level: 4,
            unlockLevels: [1, 10, 20, 30],
            serverNow: '2026-01-01 10:00:00',
            slots: [...SLOTS.slots, { id: 3, identifier: 'xp2', name: 'Experiência', icon: 'xp', expiresAt: '2026-01-01 12:00:00', seconds: 7200 }],
        }),
    });
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    const result = await service.order('xp2');

    assert.equal(model.calls.buy.length, 1);
    assert.equal(model.calls.slots, 0);
    assert.equal(result.silver, 1200);
    assert.equal(result.level, 4);
    assert.deepEqual(result.unlockLevels, [1, 10, 20, 30]);
    assert.equal(service.slots.length, 3);
    assert.deepEqual(bus.emitted.map(event => event.name), ['account:silver', 'potions:ordered']);
    assert.equal(bus.emitted[1].detail.slots.length, 3);
    assert.equal(bus.emitted[1].detail.level, 4);
});

test('a 201 without slots (the API before WP6) reads the full list and emits potions:ordered', async () => {
    const bus = fakeBus();
    const model = modelWith({ buy: () => ({ slotId: 3, silver: 1200 }) });
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    const result = await service.order('hp3');

    assert.equal(model.calls.slots, 1);
    assert.equal(result.silver, 1250);
    assert.equal(result.level, 4);
    assert.deepEqual(result.unlockLevels, [1, 10, 20, 30]);
    assert.deepEqual(bus.emitted.map(event => event.name), ['account:silver', 'potions:ordered']);
});

test('a lost 201 reconciles with a read, emits potions:reconciled and never repeats the purchase', async () => {
    const bus = fakeBus();
    const model = modelWith({ buy: () => { throw new RequestError(0, 'network'); } });
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    const result = await service.order('hp3');

    assert.equal(model.calls.buy.length, 1);
    assert.equal(model.calls.slots, 1);
    assert.equal(result.silver, 1250);
    assert.deepEqual(bus.emitted.map(event => event.name), ['account:silver', 'potions:reconciled']);
    assert.equal(bus.emitted[1].detail.slots.length, 2);
});

test('a lost 201 whose recovery read fails rejects without repeating the purchase', async () => {
    const bus = fakeBus();
    const model = modelWith({ buy: () => { throw new RequestError(408, 'timeout'); } });
    model.slots = async () => { throw new Error('read down'); };
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    await assert.rejects(service.order('hp3'), /read down/);
    assert.equal(model.calls.buy.length, 1);
    assert.deepEqual(bus.emitted, []);
});

test('a refused order (4xx) rejects without reconciling', async () => {
    const bus = fakeBus();
    const model = modelWith({ buy: () => { throw new RequestError(409, 'No free slot.', { code: 'NO_FREE_SLOT' }); } });
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    await assert.rejects(service.order('hp3'), /No free slot/);
    assert.equal(model.calls.slots, 0);
    assert.deepEqual(bus.emitted, []);
});

test('an aborted order is not treated as a lost write', async () => {
    const bus = fakeBus();
    const model = modelWith({ buy: () => { throw new RequestError(0, 'aborted', undefined, { aborted: true }); } });
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });

    await assert.rejects(service.order('hp3'));
    assert.equal(model.calls.slots, 0);
    assert.deepEqual(bus.emitted, []);
});

test('cancel removes the slot locally and emits the fact', async () => {
    const bus = fakeBus();
    const model = modelWith();
    const service = new PotionsService({ model, counts: async () => COUNTS, bus });
    await service.load();

    await service.cancel(2);

    assert.deepEqual(model.calls.cancel, [2]);
    assert.deepEqual(service.slots.map(slot => slot.id), [1]);
    assert.deepEqual(bus.emitted.at(-1), { name: 'potions:cancelled', detail: { slotId: 2 } });
});
