---
name: css-standards
description: Write or change gladCode styles — the per-page and shared stylesheets in web/public/css, how views load them, breakpoints, colours and fonts, and the 3D replay's playback-render2.css. Use whenever editing CSS or the classes views, templates and components put on elements.
---

# gladCode CSS standards

Localizes the global `css-standards` skill: follow it for the method; this file holds what is true in gladCode. On project facts, this file wins.

## Where

- `web/public/css/`: plain CSS, no preprocessor or build. One stylesheet per page (`index.css`, `profile.css`, `editor.css`, `tournament.css`, ...) plus shared ones every page links as needed: `header.css` (17 views), `dialog.css`, `side-menu.css`, `table.css`, `glad-card.css`, `docs.css`.
- Library styles not to edit: `croppie.css` (vendored), `ui-slider.css` (jQuery UI's slider markup, rendered by `components/slider.js`).
- Views link styles in their `<head>`; most use plain `href="css/<file>.css"`, and the newer pages use `{{#asset}}css/<file>.css{{/asset}}`, which versions the URL by mtime.

## Rules

- Mobile first: base rules for phones, then `@media only screen and (min-width: <n>px)`. The common steps are 600 px, then 800 and 900 px; reuse them before adding a new one. Keep the media block next to the rules it changes.
- Brand colours are literal hex values: `#00638d` is the brand blue (over a hundred uses), `#6c97a9` its muted tone, `#646464` grey text. Only `index.css`, `dev-tools.css` and `playback-render2.css` define custom properties (`:root` tokens), scoped to those pages.
- Fonts come from Google Fonts links in each view (Roboto, Source Code Pro, Acme; Cinzel on the front page and the 3D replay); icons are Font Awesome 6 from cdnjs. Use the families the page already loads.
- New or rewritten stylesheets link with `{{#asset}}` so deploys bust the cache.
- Keep each file's line endings (many are CRLF) so diffs stay readable.
- Avoid `!important`; the few existing ones override library or inline styles.
- Before removing a rule, grep its ids and classes in `web/view`, `web/public/script` (templates build markup in code) and `web/public/*.html`.

## Deviations from `css-standards`

- No shared token stylesheet and no font variables: colours and families are literal per file, as the existing pages are; tokens appear only in the three files above. A shared `tokens.css` would be a deliberate redesign, not a convention to assume.
- No `web/src/css/` and no nesting: files are flat CSS served as is.
- The breakpoint scale is this project's (600/800/900 px), not the global default.

## Checks before finishing

- The page renders at phone and desktop widths on http://localhost:8085.
- No orphaned selectors left behind by markup changes.
