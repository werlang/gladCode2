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
const { LANGUAGES, User, defaultPicture } = await import('../../../model/user.js');

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
        expect(user.id).toBe(99);
    });

    test('a nickname used by someone else is refused', async () => {
        Mysql.findOne.mockResolvedValue({ id: 8 });
        await expect(new User(row).saveProfile({ nickname: 'Bia' })).rejects.toMatchObject({ status: 409, code: 'NICKNAME_TAKEN' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('gladiators can be written in C, Python, JavaScript or blocks', () => {
        expect(LANGUAGES).toEqual(['c', 'python', 'javascript', 'blocks']);
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
});
