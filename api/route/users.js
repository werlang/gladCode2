import { Router } from 'express';
import { saveProfilePicture } from '../helpers/uploads.js';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { LANGUAGES, GLAD_VIEWS, User } from '../model/user.js';

const router = Router();

/**
 * GET /users/me
 * The signed-in account and its hero stats (`battles`, `wins`, `known`, `renown`), or `{ user: null }`
 * for visitors. `wins` counts only the engine's `win` results; `known` is every battle with a
 * `win`/`loss`/`draw` result and is the win-rate denominator. A battle with no survivor is a draw,
 * and unknown historical results are excluded rather than counted as losses. `joinedAt` is the
 * account creation date only when its provenance is known; otherwise it is null. Marks the user as
 * active.
 */
router.get('/me', auth({ optional: true }), asyncRoute(async (req, res) => {
    if (!req.user) return res.send({ user: null });
    await req.user.touch();
    return res.send({ user: await req.user.profileJSON() });
}));

/**
 * GET /users/nickname?nickname=Ana
 * Whether the nickname is free for the signed-in master: `{ nickname, available }`.
 */
router.get('/nickname', auth(), asyncRoute(async (req, res) => {
    const nickname = Validate.text(req.query.nickname, 'nickname', { min: 2, max: 30 });
    res.send({ nickname, available: await User.nicknameAvailable(req.user.id, nickname) });
}));

/**
 * PUT /users/me
 * Changes the profile. Every field is optional: `nickname` (2 to 30 characters, unique),
 * `language` (`c|python|blocks`), `preferences` (`{ message, friend, update, duel, tourn }`
 * booleans), `editorTheme`, `editorFont` (8 to 40), `showTutorial`, `theme` (`system|classic|arena-light|arena-dark`,
 * the site theme), `gladView` (`sprite|3d`, how gladiators are drawn; `3d` by default) and `picture`
 * (a cropped image as a data URL). Answers `{ user }` with the same hero stats (wins are engine
 * results; unknown results are excluded from the rate); 409 `NICKNAME_TAKEN` when the nickname is in
 * use.
 */
router.put('/me', auth(), asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const preferences = body.preferences === undefined ? undefined : Object.fromEntries(
        ['message', 'friend', 'update', 'duel', 'tourn']
            .map(name => [name, Validate.boolean(body.preferences?.[name], 'preferences', { optional: true })]),
    );

    const changes = {
        nickname: Validate.text(body.nickname, 'nickname', { min: 2, max: 30, optional: true }),
        language: Validate.oneOf(body.language, 'language', LANGUAGES, { optional: true }),
        editorTheme: Validate.text(body.editorTheme, 'editorTheme', { max: 100, pattern: /^[a-z0-9_]+$/, optional: true }),
        editorFont: Validate.integer(body.editorFont, 'editorFont', { min: 8, max: 40, optional: true }),
        showTutorial: Validate.boolean(body.showTutorial, 'showTutorial', { optional: true }),
        theme: Validate.oneOf(body.theme, 'theme', ['system', 'classic', 'arena-light', 'arena-dark'], { optional: true }),
        gladView: Validate.oneOf(body.gladView, 'gladView', GLAD_VIEWS, { optional: true }),
        preferences,
    };
    if (body.picture !== undefined) changes.picture = await saveProfilePicture(req.user.pasta, body.picture);

    const user = await req.user.saveProfile(changes);
    res.send({ user: await user.profileJSON() });
}));

export { router as usersRouter };
