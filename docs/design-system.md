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
preloaded by the head partial.

| Size token | px | Typical use |
| :--- | :--- | :--- |
| `--text-2xs` | 10 | tiny counters, badges |
| `--text-xs` | 12 | captions, footnotes |
| `--text-sm` | 14 | secondary labels, dense tables |
| `--text-base` | 16 | body, buttons |
| `--text-md` | 18 | table text, short fields |
| `--text-lg` | 20 | game buttons, card names |
| `--text-xl` | 24 | fields, section labels |
| `--text-2xl` | 32 | page titles |
| `--text-3xl` | 40 | large titles |
| `--text-4xl` | 48 | hero titles |
| `--text-5xl` | 64 | the largest glyphs; bigger ones multiply `--text-base` |

The names are node-aec's; the values are the sizes gladCode uses. They are px, not rem: the 2D
replay page scales its root font size (`html` 6px, 10px from 600px wide), so rem would shrink there.

### 1.3 Space and layout

`--space-hairline` 1px, then a 5px rhythm: `--space-1` 2px, `-2` 5px, `-3` 10px, `-4` 15px, `-5`
20px, `-6` 25px, `-7` 30px, `-8` 40px, `-9` 50px, `-10` 60px, `-11` 80px, for margins, paddings and
gaps (negative offsets: `calc(-1 * var(--space-N))`). Dimensions several sheets share are layout
tokens (`--layout-side-menu` 340px); one-off geometry of a single component (widths, heights,
larger offsets) stays in its sheet.

### 1.4 Colour roles

Every theme defines the same roles:

| Group | Roles |
| :--- | :--- |
| Surfaces | `page`, `surface`, `surface-alt`, `surface-strong`, `surface-sunken`, `neutral`, `chrome` (side panels: profile menu, docs menu, editor toolbar) |
| Translucent | `overlay` (dialog fog), `scrim`, `shade` (darkens), `tint` (hover wash), `highlight` (lightens) |
| Text | `text`, `text-strong`, `text-muted`, `text-subtle`, `text-on-brand`, `text-on-brand-muted`, `text-on-accent` |
| Brand | `brand`, `brand-hover`, `brand-muted`, `brand-soft`, `brand-text` (titles), `link`, `secondary`, `secondary-strong`, `glow` |
| Accent | `accent` (torch gold actions), `accent-strong`, `accent-hover`, `accent-text` (small gold text that must stay readable) |
| Action | `action`, `action-hover`, `text-on-action`: the view's main action (`.button.primary`), torch gold in both Arena themes, brand blue in Classic |
| Borders | `border`, `border-strong`, `border-brand`, `border-brand-muted` |
| States | `danger`, `danger-soft`, `success`, `success-soft`, `warning`, `info` |
| Code | `terminal-bg`, `terminal-text`, `code-bg` |
| Frame | `header-bg`, `header-text`, `footer-bg`, `--logo-filter` (turns the pixel logo light on the ink header), `--logo-filter-page` (the same on a dark page, such as the 404) |
| Creator chips | `pick`, `pick-hover`, `pick-selected`, `pick-item*` |
| Shadow | `--color-shadow`, `--shadow-xs/sm/md/lg/inset/halo/glow` (focus rings, bevels and coloured glows keep their own geometry with a colour token) |

All colour roles carry the `--color-` prefix. For tints of a role use
`color-mix(in srgb, var(--color-…) 30%, transparent)`, never a second literal.

### 1.5 Content colours (the same in every theme)

Colours that mean something in the game stay fixed so a gladiator, a medal or a bar reads the
same everywhere:

- Bars: `--color-hp`, `-hp-mid`, `-hp-track`, `--color-ap…`, `--color-xp`, `-xp-track`,
  `--color-level-up`, `--color-bar-danger`, `--color-timer-ok/-warn`.
- Attributes: `--color-str`, `--color-agi`, `--color-int`.
- Medals: `--color-medal-gold/silver/bronze` with `-soft`, `-strong`, `-text`.
- Profile menu frames: `--color-cat-*`.
- Code panels: `--color-code-panel`, `-panel-border`, `-text`, `-comment` and `--color-code-keyword/function/string/number` (the hero code panel and every Prism block, `components/code.css`).
- Front page: `--color-band*`, `--color-text-on-band*`, `--color-code-*` (the hero code panel).
- Blocks: `--color-block-statement`.
- 3D replay chrome: `--color-battle-*`, `--shadow-battle`, `--radius-battle` (`playback-render2.css`).

### 1.6 Radius, motion, layers, focus

- Radius: `--radius-xs` 2px, `-sm` 3px, `-md` 5px, `-lg` 10px, `-xl` 20px, `-2xl` 32px, `-round` 50%,
  `-pill`.
- Motion: `--duration-fast` 0.15s, `-quick` 0.2s, `-base` 0.3s, `-slow` 0.5s, `-slower` 1s, `-pulse`
  1.6s, `-fade` 2s, `--ease-standard`. `prefers-reduced-motion` cuts every transition and animation (`tokens.css`).
- Layers: `--z-below`, `--z-raised`, `--z-float`, `--z-dropdown`, `--z-header`, `--z-dialog`; stacking
  inside one component counts up from `--z-raised` (`calc(var(--z-raised) + 2)`).
- Element defaults (`tokens.css`): themed links (`--color-link`, offset underline), text selection, scrollbars and `accent-color`; `.visually-hidden` keeps a control reachable by keyboard while hidden (the switches of `checkboxes.css`).
- Focus: `:focus-visible` draws `--focus-ring-width` in `--focus-ring-color` (gold in Arena, blue
  in Classic) at `--focus-ring-offset`.

## 2. Components

### 2.1 Primitives

The shared UI classes, after node-aec's primitives (and mocitec's, which share the set). Each
owns one sheet in `web/public/css/components/`, loaded on every page by the head partial, and,
when it has behaviour, one class in `web/public/script/components/` on `BaseComponent`. Reuse them
before writing a page rule; pages only add placement (width, height, margins) and, where a page
really differs, a scoped size.

| Primitive | Markup | Behaviour | Variants and states |
| :--- | :--- | :--- | :--- |
| Button | `.button` on `<button>` or `<a>` (`components/button.css`) | `Button` (`components/button.js`): `new Button({ element, text, icon, title, variant })`, `click(action)` disables it with a spinner until the action settles, `disable(spin)`, `enable()`, `setText(text, icon)`, `busy` | `primary` (the main action), `secondary`, `neutral`, `ghost` (dialog actions), `outline`, `danger`, `success`; `small`, `large`; `block` (a full-width 50px bar at the foot of a dialog); `:disabled`/`.disabled`, `is-loading`, `is-progress` (`ProgressButton` in `components/simulation.js`) |
| Field | `.input` on `<input>`, `<select>`, `<textarea>` (`components/field.css`) | `Input` (`components/input.js`: `value`, `input(cb)`, `keyDown(cb)`), `Select` (`components/select.js`: `value`, `set(value)`, `setOptions(list)`, `change(cb)`), both on `Field` (`components/field.js`: `setError(message)`, `clearError()`, `error`) | underlined game field by default; `.boxed` (and every textarea) framed; `.error`/`aria-invalid`, `filled` |
| Surface | `.surface-card`, `.surface-subtle`, `.surface-pill` (`components/surface.css`) | none | a raised panel (posts, dialogs, statistics, cockpit cards), a quiet inset, a chip |
| Code panel | Prism `pre`/`code[class*=language-]` (`components/code.css`, outranks Prism's own theme) | none | dark in every theme |
| Empty state | `templates/empty-state.js` `emptyStateTemplate` rendered with `renderTemplate` (`components/empty-state.css`) | none: callers pick `variantClass`, `icon`, `title`, `summary`, `actionHtml` | full, `compact` (inside lists and tables, `.table .row.empty`) |

Modal, toast and tooltip are the existing `components/dialog.js`, `toast.js` and `tooltip.js` (the
dialog box is a `surface-card` with `ghost` buttons).

### 2.2 Feature components

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

Placement-only page rules for the primitives live in the page sheet (`#duel-box .button`,
`.window .input`). The 2D replay sizes its `.button`s in its own scaled units (`playback.css`).

## 3. CSS architecture

- Every local stylesheet and script in a view is linked through `{{#asset}}` (mtime-versioned): an unversioned link let browsers mix cached sheets with new tokens.
- No build step: each page links `tokens.css` and the primitives in `css/components/` (through the
  head partial), then the shared feature sheets it uses, then its page sheet. `{{#asset}}` versions every file by mtime.
- Page sheets are named after the page (`profile.css`, `editor.css`, ...); a shared sheet is named
  after its component.
- Files are LF, without trailing whitespace (`git diff --check` must pass).
- Component sheets use native CSS nesting (`&:hover`, `&.variant`); a component that sets `display`
  keeps `&[hidden] { display: none; }`.
- No inline styles from JavaScript except dynamic geometry (positions, a progress width, the width
  a busy `Button` keeps); states are classes (`flash`, `is-loading`, `is-progress`). Inline styles in
  views use tokens.

## 4. Ownership map

| Area | Owner |
| :--- | :--- |
| Tokens, themes, fonts, element defaults (`html`, `body`, focus, reduced motion) | `tokens.css` |
| UI primitives (button, field, surface, empty state) | `css/components/*.css`; behaviour in `components/button.js`, `field.js`, `input.js`, `select.js`; markup in `templates/empty-state.js` |
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

- One-off layout geometry (widths, heights, offsets over 80px) stays literal; line-height,
  font-weight, opacity and letter-spacing are not tokens (node-aec does not tokenize them either).
- The 2D replay chrome keeps rem/em sizes against its scaled root instead of the type and space
  scales.
- Many views still toggle `style.display` from JavaScript instead of `hidden` or a state class.
- Blockly block colours are set in JavaScript (`script/blocks.js` `setColour`) and stay literal.
- The classic 2D renderer (`render.js`) draws on canvas with its own colours.
- The Prism code theme (`prism-coy`, light) is loaded from a CDN in every theme.
- The front page's `<meta name="theme-color">` is fixed (Arena ink) and does not follow the theme.
