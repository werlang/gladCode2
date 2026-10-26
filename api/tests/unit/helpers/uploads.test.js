import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { saveProfilePicture } from '../../../helpers/uploads.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');

describe('profile picture uploads', () => {
    beforeEach(async () => {
        process.env.PROFPICS_DIR = await mkdtemp(path.join(tmpdir(), 'profpics-'));
    });

    test('stores a PNG under the account folder name', async () => {
        const url = await saveProfilePicture('abc123', `data:image/png;base64,${PNG}`);
        expect(url).toMatch(/^\/profpics\/abc123\.png\?v=\d+$/);
        expect((await readFile(path.join(process.env.PROFPICS_DIR, 'abc123.png')))[0]).toBe(0x89);
    });

    test('refuses content that does not match its type, and unsafe names', async () => {
        await expect(saveProfilePicture('abc', `data:image/jpeg;base64,${PNG}`)).rejects.toMatchObject({ code: 'INVALID_PICTURE' });
        await expect(saveProfilePicture('../x', `data:image/png;base64,${PNG}`)).rejects.toMatchObject({ code: 'INVALID_PICTURE' });
        await expect(saveProfilePicture('abc', 'data:text/html;base64,PGI+')).rejects.toMatchObject({ code: 'INVALID_PICTURE' });
    });
});
