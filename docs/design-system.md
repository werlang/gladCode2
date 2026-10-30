# gladCode Design System

The implementation contract behind the visual direction in [DESIGN.md](../DESIGN.md).
`DESIGN.md` says what the interface should feel like; this document names the tokens, themes,
components and ownership rules that make it so.

Single sources of truth:

- **Tokens and themes:** [`web/public/css/tokens.css`](../web/public/css/tokens.css)
- **Theme switch:** [`web/public/script/theme-boot.js`](../web/public/script/theme-boot.js) (before
  paint) and [`web/public/script/helpers/theme.js`](../web/public/script/helpers/theme.js) (choice,
  cache, live system changes)
- **Component styles:** the shared sheets in [`web/public/css/`](../web/public/css/) (see the
  ownership map)
- **Component behaviour:** [`web/public/script/components/`](../web/public/script/components/)

Anything not named here is not part of the system: extend a token or a component instead of
inventing a parallel value. See *Governance* for the change process.

## 1. Tokens

All tokens live in `tokens.css`, loaded first on every page by the head partial
(`web/view/head.html`, included as `{{> head}}` after the viewport meta; `web/public/maintenance.html`
links it directly). Page and component sheets reference them with `var(--…)`; colours, fonts,
radii, durations and layers are not hard-coded in leaf files.

The file has three layers:

1. **Raw palettes** (`--classic-*`, `--arena-*`, `--arena-day-*`): never referenced outside
   `tokens.css`.
2. **Content colours and scales** (`--color-hp`, `--color-str`, `--font-*`, `--radius-*`, ...): the
   same in every theme.
3. **Role mappings** per theme (`--color-page`, `--color-text`, `--color-brand`, ...): what a
   stylesheet uses for anything that should follow the theme.

### 1.1 Themes

| Theme | Selector | Character |
| :--- | :--- | :--- |
| Arena light | `:root`, `:root.theme-arena-light` | the coliseum by day: parchment and sand, ink text, ink header and side panels |
| Arena dark | `:root.theme-arena-dark`, `.tone-night` | night over the coliseum: ink surfaces, mist text, sand titles |
| Classic | `:root.theme-classic` | the old workshop: light grey page, white panels, brand blue header and panels |

- **Choice:** masters pick `system`, `classic`, `arena-light` or `arena-dark` in the profile
  settings (`#site-theme`). It is stored on the account (`usuarios.site_theme`, NULL for `system`;
  `PUT /users/me` with `theme`) and cached in `localStorage` `gladcode-theme` (LocalData format
  `{ data, expires: false }`).
- **Before paint:** `theme-boot.js` is a blocking classic script right after `tokens.css`. It reads
  the cache and sets `theme-<name>` on `<html>`; `system` resolves to Arena dark or light from
  `prefers-color-scheme`.
- **After load:** `components/header.js` applies the account's choice when it differs from the
  cache (another device changed it); `applyTheme` follows live system changes while the choice is
  `system` and fires `themechange` on `document`.
- **`tone-night`:** a region that stays dark in every theme (the front page hero over the arena
  video, code panels). The class applies the Arena dark roles to that subtree and sets its text
  colour.

### 1.2 Type

| Token | Value | Use |
| :--- | :--- | :--- |
| `--font-body` | Roboto | reading text, forms |
| `--font-game` | Acme | the game's interface lettering: cards, profile, tournaments, the 2D replay |
| `--font-display` | Cinzel (Arena), Acme (Classic) | headings only |
| `--font-mono` | Source Code Pro | code, numbers, menus that were monospace |
| `--font-digits` | Orbitron | countdown digits |
| `--font-arena`, `--font-classic` | Cinzel, Acme | raw families behind the roles above |

Fonts are self-hosted in `web/public/fonts/` (Latin subset, `OFL-*.txt` beside them); Roboto is
preloaded by the head partial. Font sizes and spacing are still literal (see *Known gaps*).

### 1.3 Colour roles

Every theme defines the same roles:

| Group | Roles |
| :--- | :--- |
| Surfaces | `page`, `surface`, `surface-alt`, `surface-strong`, `surface-sunken`, `neutral`, `chrome` (side panels: profile menu, docs menu, editor toolbar) |
| Translucent | `overlay` (dialog fog), `scrim`, `shade` (darkens), `tint` (hover wash), `highlight` (lightens) |
| Text | `text`, `text-strong`, `text-muted`, `text-subtle`, `text-on-brand`, `text-on-brand-muted`, `text-on-accent` |
| Brand | `brand`, `brand-hover`, `brand-muted`, `brand-soft`, `brand-text` (titles), `link`, `secondary`, `secondary-strong`, `glow` |
| Accent | `accent` (torch gold actions), `accent-strong`, `accent-hover`, `accent-text` (small gold text that must stay readable) |
| Borders | `border`, `border-strong`, `border-brand`, `border-brand-muted` |
| States | `danger`, `danger-soft`, `success`, `success-soft`, `warning`, `info` |
| Code | `terminal-bg`, `terminal-text`, `code-bg` |
| Frame | `header-bg`, `header-text`, `footer-bg`, `--logo-filter` (turns the pixel logo light on the ink header), `--logo-filter-page` (the same on a dark page, such as the 404) |
| Creator chips | `pick`, `pick-hover`, `pick-selected`, `pick-item*` |
| Shadow | `--color-shadow`, `--shadow-sm/md/lg/inset/glow` |

All colour roles carry the `--color-` prefix. For tints of a role use
`color-mix(in srgb, var(--color-…) 30%, transparent)`, never a second literal.

### 1.4 Content colours (the same in every theme)

Colours that mean something in the game stay fixed so a gladiator, a medal or a bar reads the
same everywhere:

- Bars: `--color-hp`, `-hp-mid`, `-hp-track`, `--color-ap…`, `--color-xp`, `-xp-track`,
  `--color-level-up`, `--color-bar-danger`, `--color-timer-ok/-warn`.
- Attributes: `--color-str`, `--color-agi`, `--color-int`.
- Medals: `--color-medal-gold/silver/bronze` with `-soft`, `-strong`, `-text`.
- Profile menu frames: `--color-cat-*`.
- Front page: `--color-band*`, `--color-text-on-band*`, `--color-code-*` (the hero code panel).
- Blocks: `--color-block-statement`.
- 3D replay chrome: `--color-battle-*`, `--shadow-battle`, `--radius-battle` (`playback-render2.css`).

### 1.5 Radius, motion, layers, focus

- Radius: `--radius-xs` 2px, `-sm` 3px, `-md` 5px, `-lg` 10px, `-xl` 20px, `-round` 50%, `-pill`.
- Motion: `--duration-fast` 0.15s, `-quick` 0.2s, `-base` 0.3s, `-slow` 0.5s, `-slower` 1s,
  `--ease-standard`. `prefers-reduced-motion` cuts every transition and animation (`tokens.css`).
- Layers: `--z-below`, `--z-raised`, `--z-float`, `--z-dropdown`, `--z-header`, `--z-dialog`.
- Focus: `:focus-visible` draws `--focus-ring-width` in `--focus-ring-color` (gold in Arena, blue
  in Classic) at `--focus-ring-offset`.

## 2. Components

| Component | Styles | Behaviour |
| :--- | :--- | :--- |
| Fog, dialog box, terminal, toast | `dialog.css` (`#fog`, `#dialog-box`, `#terminal`, `.toast`) | `components/dialog.js`, `components/toast.js` |
| Tooltip | `dialog.css` (`.ui-tooltip`) | `components/tooltip.js` |
| Header and footer | `header.css` | `components/header.js` |
| Side menu (docs) | `side-menu.css` | `components/side-menu.js` |
| Gladiator card | `glad-card.css` | `components/glad-card.js` |
| Slider | `ui-slider.css` (base), `slider.css` (editor and profile look) | `components/slider.js` |
| Radio, checkbox | `radio.css`, `checkboxes.css` | native inputs |
| Tables | `table.css` (docs, stats), `table2.css` (profile lists) | page scripts |
| 3D replay HUD | canvas (`render2/hud.js`), settings window in `playback-render2.css` | `render2/hud-controls.js` |

Buttons are not shared yet: `editor.css`, `profile.css`, `playback.css` and `dialog.css` each style
their own `.button` from the same roles.

## 3. CSS architecture

- No build step: each page links `tokens.css` (through the head partial), then the shared component
  sheets it uses, then its page sheet. `{{#asset}}` versions every file by mtime.
- Page sheets are named after the page (`profile.css`, `editor.css`, ...); a shared sheet is named
  after its component.
- Files are LF, without trailing whitespace (`git diff --check` must pass).
- Inline styles in views and colours set from JavaScript use the same tokens
  (`style.backgroundColor = 'var(--color-brand)'`).

## 4. Ownership map

| Area | Owner |
| :--- | :--- |
| Tokens, themes, fonts, element defaults (`html`, `body`, focus, reduced motion) | `tokens.css` |
| Theme choice and cache | `theme-boot.js`, `helpers/theme.js`, `profile/settings.js`, `components/header.js` |
| Account theme | `api/model/user.js` (`site_theme`), `PUT /users/me` |
| Front page | `index.css` (`.home` scope, `--gutter` and `--max` are local layout variables) |
| 2D replay | `playback.css`; canvas colours in `render.js` are not themed |
| 3D replay | `playback-render2.css` and the canvas HUD in `render2/` |
| Administrators' cockpit | `dev-tools.css` |

## 5. Governance

- A new colour is a role or a content colour in `tokens.css` first, defined in every theme block
  when it is a role. `tests/frontend/theme.test.mjs` checks that every theme the helper offers has
  a mapping and that the boot script accepts it.
- Check every changed page in Arena light, Arena dark and Classic, at desktop and phone widths.
  Signed in locally (`docker compose exec -T api node scripts/issue-session.js <id>`), set the
  theme in the profile, or write `localStorage['gladcode-theme']` as
  `{"data":"arena-dark","expires":false}` and reload.
- Content colours never follow the theme; if a colour carries game meaning, it is a content colour.
- `DESIGN.md` changes when the direction changes; this file changes with the tokens.

## 6. Known gaps

- Font sizes and spacing are literal in the page sheets; no type or space scale yet.
- No shared `.button` component (see *Components*).
- Blockly block colours are set in JavaScript (`script/blocks.js` `setColour`) and stay literal.
- The classic 2D renderer (`render.js`) draws on canvas with its own colours.
- The Prism code theme (`prism-coy`, light) is loaded from a CDN in every theme.
- The front page's `<meta name="theme-color">` is fixed (Arena ink) and does not follow the theme.
