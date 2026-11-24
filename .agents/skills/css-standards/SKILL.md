---
name: css-standards
description: Write or change gladCode styles — the design tokens, the three themes, the UI primitives (button, field, surface, empty state) (Arena light, Arena dark, Classic) in web/public/css/tokens.css, the per-page and shared stylesheets, how views load them, breakpoints, colours and fonts, and the 3D replay's playback-render2.css. Use whenever editing CSS, inline styles, colours set from JavaScript, or the classes views, templates and components put on elements.
---

# gladCode CSS standards

Localizes the global `css-standards` skill: follow it for the method; this file holds what is true in gladCode. On project facts, this file wins. The contract is [`docs/design-system.md`](../../../docs/design-system.md); the direction is [`DESIGN.md`](../../../DESIGN.md).

## Where

- `web/public/css/tokens.css`: every shared value (colour roles per theme, content colours, fonts, the type and space scales, layout widths, radii, shadows, durations, layers, focus) and the self-hosted `@font-face` rules. Loaded first on every page by the head partial `web/view/head.html` (`{{> head}}` right after the viewport meta), together with the blocking `script/theme-boot.js`; `web/public/maintenance.html` links both directly.
- `web/public/css/components/`: the UI primitives (`button.css`, `field.css`, `surface.css`, `empty-state.css`), also linked by the head partial on every page; their behaviour is `script/components/button.js`, `input.js`, `select.js` (on `field.js`) and `templates/empty-state.js`.
- One stylesheet per page (`index.css`, `profile.css`, `editor.css`, `tournament.css`, ...) plus shared feature sheets: `header.css`, `dialog.css` (fog, dialog box, terminal, toast), `side-menu.css`, `glad-card.css`, `table.css`, `table2.css`, `slider.css` over `ui-slider.css`, `radio.css`, `checkboxes.css`, `docs.css`. The ownership map is in the design-system doc.
- Vendored, not to edit: `croppie.css`.
- Views link styles with `{{#asset}}css/<file>.css{{/asset}}`, which versions the URL by mtime.

## Rules

- **Tokens only.** Colours, fonts, font sizes (`--text-*`), margins, paddings and gaps (`--space-*`), radii, shadows, durations and z-indexes come from `var(--…)`; local stacking counts up from `--z-raised`. One-off geometry (a component's width, height or a large offset) may stay literal; a dimension two sheets share becomes a `--layout-*` token. Use the role that names the job (`--color-surface`, `--color-text-muted`, `--color-brand-text`, `--color-danger`, `--color-chrome`), not the nearest colour. Tints: `color-mix(in srgb, var(--color-…) 30%, transparent)`.
- **Three themes.** Arena light (`:root`, `:root.theme-arena-light`), Classic (`:root.theme-classic`) and Arena dark (`:root.theme-arena-dark`, `.tone-night`). A new role goes into all three blocks; `tests/frontend/theme.test.mjs` checks each theme has a block.
- **Content colours never follow the theme.** Anything with game meaning (HP/AP/XP bars, `--color-level-up`, STR/AGI/INT, medals, profile menu frames, the front page band and code panel, the 3D chrome's `--color-battle-*`) uses its content token, defined once.
- **Fonts.** `--font-body` (Roboto) for reading; `--font-game` (Acme, every theme) for game interface copy; `--font-display` (Cinzel in Arena, Acme in Classic) for headings only, never for paragraphs or tables; `--font-mono`, `--font-digits`. All are self-hosted in `web/public/fonts/`; no Google Fonts links. Icons stay Font Awesome 6 from cdnjs.
- **Primitives first.** Buttons are `.button` with a variant class (`secondary`, `neutral`, `ghost`, `outline`, `danger`, `success`, `small`, `large`, `block`), fields are `.input` (`.boxed` framed), card shells are `.surface-card`, "nothing here" is `emptyStateTemplate`. A page rule only adds placement (width, height, margins); colours, fonts, hover and disabled states come from the primitive. Async buttons use `Button#click`, fields with errors use `Input`/`Select` `setError`.
- **Dark regions.** Put `tone-night` on a region that must stay dark in every theme (the front page hero, code panels).
- **No inline styles from JavaScript** except dynamic geometry (positions, a progress width); visual states are classes. Inline styles in views use tokens.
- Mobile first: base rules for phones, then `@media only screen and (min-width: <n>px)`. The common steps are 600 px, then 800 and 900 px; reuse them before adding one. Keep the media block next to the rules it changes.
- Files are LF without trailing whitespace (`git diff --check` must pass).
- Avoid `!important`; the few existing ones override library or inline styles.
- Before removing a rule, grep its ids and classes in `web/view`, `web/public/script` (templates build markup in code) and `web/public/*.html`.

## Deviations from `css-standards`

- No separate CSS source layer and no build: files are served as is; each page links `tokens.css` and the primitives (via the head partial), its shared feature sheets, then its own sheet. Component sheets use native nesting; older page sheets are flat.
- The type scale is in px (the 2D replay scales its root font size) and the space scale follows the site's 5px rhythm rather than a 4px grid. `playback.css` keeps its own rem/em sizes for the replay chrome.
- The breakpoint scale is this project's (600/800/900 px), not the global default.

## Checks before finishing

- Every changed page in Arena light, Arena dark and Classic, at phone and desktop widths, on http://localhost:8085. Set the theme in the profile settings, or run `localStorage.setItem('gladcode-theme', JSON.stringify({ data: 'arena-dark', expires: false }))` and reload (a signed-in account's choice overrides the cache after load).
- No new literal colour outside `tokens.css`: `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" web/public/css/<file>.css`.
- No new literal size: `grep -nE "^\s*(font-size|margin|padding|gap)[a-z-]*\s*:[^;]*[0-9](px|em|rem)" web/public/css/<file>.css` (except `playback.css`).
- No orphaned selectors left behind by markup changes.
