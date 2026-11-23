import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { select: vi.fn(), update: vi.fn() },
}));

const { Mysql } = await import('../../../helpers/mysql.js');
const { News } = await import('../../../model/news.js');

describe('News', () => {
    beforeEach(() => vi.resetAllMocks());

    test('lists presentation fields, the post version and the reader read state', async () => {
        Mysql.select.mockResolvedValue([{
            hash: 'ab12', title: 'Arena 3D', time: '2026-11-20 10:00:00', post: '<p>Coliseu <b>novo</b></p>',
            category: 'Atualização', excerpt: '', image: null, image_alt: '', version: '2.9.3', isread: 1,
        }]);
        const posts = await News.list(0, { readBefore: '2026-11-21 00:00:00' });
        expect(posts[0].toJSON()).toMatchObject({
            hash: 'ab12', category: 'Atualização', excerpt: 'Coliseu novo', image: null,
            imageAlt: '', read: true, version: '2.9.3',
        });
        expect(Mysql.select.mock.calls[0][1][0]).toBe('2026-11-21 00:00:00');
    });

    test('a post without its own version omits it instead of borrowing the engine version', async () => {
        Mysql.select.mockResolvedValue([{
            hash: 'cd34', title: 'Sem versão', time: '2026-11-19 10:00:00', post: '<p>Nota</p>',
            category: 'Regras', excerpt: '', image: null, image_alt: '', version: null, isread: 0,
        }]);
        const [post] = await News.list(0);
        expect(post.toJSON().version).toBeNull();
    });

    test('marks every post read and answers the count with the server marker', async () => {
        Mysql.select.mockResolvedValue([{ unread: 3 }]);
        const user = { id: 7, markNewsRead: vi.fn(async () => '2026-11-23 20:00:00.000') };
        await expect(News.markAllRead(user)).resolves.toEqual({
            read: 3, unread: 0, readAt: '2026-11-23 20:00:00.000',
        });
        expect(user.markNewsRead).toHaveBeenCalledOnce();
    });
});
