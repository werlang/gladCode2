import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(),
        findOne: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }),
    },
}));

const { Mysql } = await import('../../../helpers/mysql.js');
const { User, defaultPicture } = await import('../../../model/user.js');

const row = {
    id: 7, email: 'ana@example.com', googleid: 'g-1', apelido: 'Ana', nome: 'Ana', sobrenome: 'Lima', foto: null,
    pref_language: 'python', lvl: 3, xp: 10, silver: 50, credits: 0, premium: null, apothecary: 1, showTutorial: 1,
    editor_theme: 'monokai', editor_font: 18, pref_message: 1, pref_friend: 0, pref_update: 1, pref_duel: 1, pref_tourn: 0, pasta: 'abc',
};

describe('User', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        delete process.env.ADMIN_EMAILS;
    });

    test('serialises to camelCase with a default picture and boolean switches', () => {
        const json = new User(row).toJSON();
        expect(json).toMatchObject({
            id: 7, nickname: 'Ana', language: 'python', level: 3, premium: false, showTutorial: true,
            editorTheme: 'monokai', editorFont: 18, picture: defaultPicture('ana@example.com'), isAdmin: false,
            preferences: { message: true, friend: false, update: true, duel: true, tourn: false },
        });
        expect(json).not.toHaveProperty('pasta');
        expect(json).not.toHaveProperty('googleid');
        expect(json.joinedAt).toBeNull();
    });

    test('joinedAt is the account creation date only when its provenance is known', () => {
        expect(new User({ ...row, ativo: '2026-11-23 18:00:00', created_at: '2019-03-14 12:00:00', created_at_known: 1 }).toJSON().joinedAt)
            .toBe('2019-03-14 12:00:00');
        // the original 009 copied activity into created_at; the provenance flag hides it
        expect(new User({ ...row, ativo: '2026-11-23 18:00:00', created_at: '2019-03-14 12:00:00', created_at_known: 0 }).toJSON().joinedAt)
            .toBeNull();
        // a legacy account has no known creation date, even though it has been active since
        expect(new User({ ...row, ativo: '2026-11-23 18:00:00', created_at: null, created_at_known: 0 }).toJSON().joinedAt).toBeNull();
    });

    test('admins come from ADMIN_EMAILS, case-insensitively', () => {
        process.env.ADMIN_EMAILS = 'x@y.z, ANA@example.com';
        expect(new User(row).isAdmin).toBe(true);
        expect(new User({ ...row, email: 'Ana@Example.COM' }).isAdmin).toBe(true);
        expect(new User({ ...row, email: 'bo@example.com' }).isAdmin).toBe(false);
        process.env.ADMIN_EMAILS = '';
        expect(new User(row).isAdmin).toBe(false);
    });

    test('Google sign-in links an existing account found by email', async () => {
        Mysql.select.mockResolvedValue([{ ...row, googleid: null }]);
        const user = await User.signInWithGoogle({ email: 'ana@example.com', givenName: 'Ana', familyName: 'Lima', sub: 'g-9' });
        expect(user.id).toBe(7);
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { googleid: 'g-9', email: 'ana@example.com' }, { id: 7 }, {});
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('Google sign-in follows the Google identity when the email changed', async () => {
        Mysql.select.mockResolvedValue([{ ...row, googleid: 'g-9' }]);
        await User.signInWithGoogle({ email: 'new@example.com', givenName: 'Ana', familyName: '', sub: 'g-9' });
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { googleid: 'g-9', email: 'new@example.com' }, { id: 7 }, {});
    });

    test('an account linked to another Google identity is not taken over by its email', async () => {
        Mysql.select.mockResolvedValue([{ ...row, googleid: 'g-1' }]);
        await expect(User.signInWithGoogle({ email: 'ana@example.com', givenName: 'Ana', familyName: '', sub: 'g-2' }))
            .rejects.toMatchObject({ status: 403, code: 'GOOGLE_ACCOUNT_MISMATCH' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('Google sign-in creates an account with a numbered nickname', async () => {
        Mysql.select.mockResolvedValue([]);
        Mysql.insert.mockResolvedValue({ insertId: 99, affectedRows: 1 });
        Mysql.findOne.mockResolvedValue({ ...row, id: 99 });
        const user = await User.signInWithGoogle({ email: 'bo@example.com', givenName: 'Bo', familyName: '', sub: 'g-2' });
        const [, inserted] = Mysql.insert.mock.calls[0];
        expect(inserted).toMatchObject({ googleid: 'g-2', email: 'bo@example.com', nome: 'Bo' });
        expect(inserted.apelido).toMatch(/^Bo\d{3}$/);
        expect(inserted.pasta).toMatch(/^[a-f0-9]{32}$/);
        expect(inserted.created_at.toSqlString()).toBe('NOW()');
        expect(inserted.created_at_known).toBe(1);
        expect(user.id).toBe(99);
    });

    test('a nickname used by someone else is refused', async () => {
        Mysql.findOne.mockResolvedValue({ id: 8 });
        await expect(new User(row).saveProfile({ nickname: 'Bia' })).rejects.toMatchObject({ status: 409, code: 'NICKNAME_TAKEN' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('profile changes map to their columns', async () => {
        await new User(row).saveProfile({ language: 'c', preferences: { friend: true, tourn: false }, showTutorial: false, editorFont: 20 });
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { pref_language: 'c', editor_font: 20, showTutorial: 0, pref_friend: 1, pref_tourn: 0 }, { id: 7 }, {});
    });

    test('the site theme is saved on the account, and `system` clears the choice', async () => {
        await new User(row).saveProfile({ theme: 'arena-dark' });
        expect(Mysql.update).toHaveBeenLastCalledWith('usuarios', { site_theme: 'arena-dark' }, { id: 7 }, {});
        await new User(row).saveProfile({ theme: 'system' });
        expect(Mysql.update).toHaveBeenLastCalledWith('usuarios', { site_theme: null }, { id: 7 }, {});
        expect(new User(row).toJSON().theme).toBe('system');
        expect(new User({ ...row, site_theme: 'classic' }).toJSON().theme).toBe('classic');
    });

    test('the gladiator style is saved on the account; the 3D coliseum is the default', async () => {
        await new User(row).saveProfile({ gladView: 'sprite' });
        expect(Mysql.update).toHaveBeenLastCalledWith('usuarios', { glad_view: 'sprite' }, { id: 7 }, {});
        await new User(row).saveProfile({ gladView: '3d' });
        expect(Mysql.update).toHaveBeenLastCalledWith('usuarios', { glad_view: '3d' }, { id: 7 }, {});
        // the column is NULL until a master chooses, and NULL means the current 3D look
        expect(new User(row).toJSON().gladView).toBe('3d');
        expect(new User({ ...row, glad_view: 'sprite' }).toJSON().gladView).toBe('sprite');
        expect(new User({ ...row, glad_view: '3d' }).toJSON().gladView).toBe('3d');
    });

    test('markNewsRead stores and returns the exact server marker', async () => {
        Mysql.select.mockResolvedValue([{ marker: '2026-11-23 20:00:00.000' }]);
        await expect(new User(row).markNewsRead()).resolves.toBe('2026-11-23 20:00:00.000');
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { read_news: '2026-11-23 20:00:00.000' }, { id: 7 });
    });

    test('the profile stats count engine results and exclude unknown ones from the rate', async () => {
        Mysql.select.mockResolvedValue([{ battles: 8, wins: 5, known: 6, renown: 1482.4 }]);
        await expect(User.stats(7)).resolves.toEqual({ battles: 8, wins: 5, known: 6, renown: 1482 });
        expect(Mysql.select.mock.calls[0][1]).toEqual([7, 7, 7, 7]);
        // a positive reward is not a win, and a legacy unknown result is not a loss
        expect(Mysql.select.mock.calls[0][0]).toContain("r.result = 'win'");
        expect(Mysql.select.mock.calls[0][0]).toContain('r.result IS NOT NULL');
        expect(Mysql.select.mock.calls[0][0]).not.toContain('r.placement = 0');
        expect(Mysql.select.mock.calls[0][0]).not.toContain('r.reward > 0');
    });

    test('presence writes at most once a minute, and seeds a missing timestamp once', async () => {
        Mysql.update.mockResolvedValue(1);
        await new User({ ...row, ativo: '2026-11-24 10:00:00' }).touch();
        expect(Mysql.update).toHaveBeenCalledWith(
            'usuarios',
            { ativo: expect.anything() },
            { id: 7, ativo: { '<': expect.anything() } },
        );
        const [, , filter] = Mysql.update.mock.calls[0];
        expect(filter.ativo['<'].toSqlString()).toBe('NOW() - INTERVAL 1 MINUTE');

        Mysql.update.mockClear();
        await new User({ ...row, ativo: null }).touch();
        expect(Mysql.update).toHaveBeenCalledWith(
            'usuarios',
            { ativo: expect.anything() },
            { id: 7, ativo: null },
        );
    });

    test('a profile save may omit the gladiator style', async () => {
        await new User(row).saveProfile({ language: 'c' });
        expect(Mysql.update).toHaveBeenLastCalledWith('usuarios', { pref_language: 'c' }, { id: 7 }, {});
    });
});
