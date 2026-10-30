# gladCode design system

Branch `feat/design-system` (from `refactor/node-services`). Built the node-aec way: `DESIGN.md`
(direction), `docs/design-system.md` (implementation contract), one token source, a generated
gallery, and every stylesheet on the tokens.

Decisions taken with the user:

- Two themes: **Arena** (dark: ink, sand, gold, the brand blue; from the front page and the 3D
  replay) and **Classic** (light: white and grey surfaces, the brand blue; from the older pages).
- Selectable in the profile settings, saved on the account (API + migration), cached in the
  browser so pages open in the right theme; until a master chooses, the system preference picks
  (dark → Arena, light → Classic).
- Full migration: every stylesheet moves to the tokens now.
- Fonts self-hosted (`web/public/fonts/`, OFL licences beside them).

## Token scope

Colours (semantic roles, one value per theme), font families, radii, shadows, motion durations
and z-index layers. Font sizes and spacing stay literal in this pass (relative `em` sizes per
component); listed as known gaps.

## Phases (each committed and verified)

1. Foundation: fonts, `web/public/css/tokens.css` (raw palettes, role mapping per theme, scales),
   `web/view/head.html` partial (fonts, tokens, theme boot) in every view, `script/theme.js`
   helper, `DESIGN.md`, `docs/design-system.md`.
2. Theme preference: migration (`usuarios.theme`), `PUT /users/me` and the user JSON,
   the settings tab selector, header sync from the account.
3. Shared stylesheets on tokens: header, dialog, side-menu, glad-card, tables, sliders, radio,
   checkboxes, sprite (creator), notfound.
4. Page stylesheets on tokens: index, about, docs/manual/function/post/stats/update, profile,
   editor, tournament, training, playback (+ render2 chrome), dev-tools (off-brand indigo moves
   into the system).
5. Colours set from scripts and templates (progress bars, inline styles).
6. Gallery generator and docs; project skills (`css-standards`, `frontend-development`) updated.

Verification per phase: lint, frontend tests, and screenshots of every touched page in both
themes at phone and desktop widths (headless browser), Classic compared with the pre-migration
look.
