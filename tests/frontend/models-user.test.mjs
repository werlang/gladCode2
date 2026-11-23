// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/models-user.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { UserModel } = await import('../../web/public/script/models/user.js');
const { api } = await import('../../web/public/script/helpers/request.js');

test('a save that settles after signOut does not restore the user cache', async () => {
    const original = { get: api.get, put: api.put, post: api.post };
    let releaseUpdate;
    const updateAnswer = new Promise(resolve => { releaseUpdate = resolve; });
    let currentCalls = 0;
    api.get = async () => {
        currentCalls += 1;
        return { user: null };
    };
    api.put = () => updateAnswer;
    api.post = async () => null;

    try {
        await UserModel.signOut();

        const save = UserModel.update({ theme: 'classic' });
        const signOut = UserModel.signOut();
        releaseUpdate({ user: { id: 277, theme: 'classic' } });
        await Promise.all([save, signOut]);

        const user = await UserModel.current();
        assert.equal(user, null);
        assert.equal(currentCalls, 1);
        assert.equal(UserModel.isLogged(user), false);
    }
    finally {
        api.get = original.get;
        api.put = original.put;
        api.post = original.post;
    }
});
