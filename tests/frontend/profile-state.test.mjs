// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/profile-state.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { nicknameUndoValue, shouldSaveThemePick } from '../../web/public/script/helpers/profile-state.js';

test('state-machine table: the header re-pick and the nickname undo settle their exact sequences', () => {
    const themeCases = [
        { name: 'a different theme while idle', choice: 'classic', confirmed: 'system', busy: false, save: true },
        { name: 'the confirmed theme while idle', choice: 'system', confirmed: 'system', busy: false, save: false },
        { name: 'the confirmed theme while a PUT is in flight (the r3 F4 revert)', choice: 'system', confirmed: 'system', busy: true, save: true },
        { name: 'a different theme while a PUT is in flight', choice: 'arena-dark', confirmed: 'system', busy: true, save: true },
    ];
    for (const item of themeCases) {
        assert.equal(
            shouldSaveThemePick({ choice: item.choice, confirmed: item.confirmed, busy: item.busy }),
            item.save,
            item.name,
        );
    }

    const nicknameCases = [
        // r3 F5: the preview puts the old value in; a draft typed during the PUT is kept.
        { name: 'preview', current: 'NomeA', target: 'MestreArena', confirmed: 'NomeA', preview: null, phase: 'preview', value: 'MestreArena' },
        { name: 'successful undo', current: 'MestreArena', target: 'MestreArena', confirmed: 'MestreArena', preview: 'MestreArena', phase: 'settle', value: 'MestreArena' },
        { name: 'draft typed during the undo PUT', current: 'RascunhoB', target: 'MestreArena', confirmed: 'MestreArena', preview: 'MestreArena', phase: 'settle', value: null },
        // F1: without a draft, a refused undo goes back to the confirmed nickname, not the preview.
        { name: 'refused undo with no draft', current: 'MestreArena', target: 'NomeA', confirmed: 'NomeA', preview: 'MestreArena', phase: 'settle', value: 'NomeA' },
        { name: 'draft typed before the undo', current: 'RascunhoC', target: 'MestreArena', confirmed: 'NomeA', preview: null, phase: 'preview', value: null },
    ];
    for (const item of nicknameCases) {
        assert.equal(
            nicknameUndoValue({
                current: item.current,
                target: item.target,
                confirmed: item.confirmed,
                preview: item.preview,
                phase: item.phase,
            }),
            item.value,
            item.name,
        );
    }
});
