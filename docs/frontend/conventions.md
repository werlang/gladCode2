# Frontend conventions

The rules every frontend module in `web/public/script/`, every stylesheet in `web/public/css/` and every
view in `web/view/` follows. They are the contract WP2–WP9 implement; see
[README.md](README.md) for the current/planned split.

## 1. Folders and their single job

| Folder | Owns | Does not |
| :--- | :--- | :--- |
| `web/view/` | Mustache page shells and partials (`head`, `header`, `footer`, `analytics`). Markup only. | Business rules, data loading, inline `<script>` logic. |
| `web/middleware/`, `web/helpers/` | `res.page()`, asset/module versioning, the import map, URL building and legacy redirects. | Anything browser-side. |
| `web/public/script/*.js` | One page entry per route: read the server values, mount the shell and the section controllers. | Reusable DOM behaviour, API calls, markup strings. |
| `web/public/script/components/` | Reusable DOM behaviour: one class per element, extending `BaseComponent`, owning its listeners, states and ARIA. | Fetching data, deciding game rules, page layout. |
| `web/public/script/helpers/` | Utilities with no view logic: request transport, escaping/templates, dates, local storage, theme, gladiator style, sprites, replay maths, the event bus. New helpers are DOM-free and unit-testable under Node. | Page layout, components, application state shared across sections (that is `services/`). The pre-existing DOM-touching helpers (`animate.js` animations, `google-login.js`'s GIS script, `spritesheet.js` canvases, `portrait-cache.js` IndexedDB) stay until the section that uses them is rebuilt; new code does not add another. |
| `web/public/script/models/` | The **only** callers of the API, one class per API area, through `helpers/request.js`. | Rendering, DOM, user-facing copy beyond error codes. |
| `web/public/script/templates/` | Markup strings with `{{key}}` placeholders, rendered with `renderTemplate`. | Logic, loops, conditionals, `${}` interpolation. |
| `web/public/script/services/` (**planned, WP2**) | DOM-free application state shared across sections: account, notification counts, shell state. Calls models, emits app events, caches what a section needs. | Touching the DOM, owning components, deciding layout. |
| `web/public/script/profile/` → `sections/` (**planned, WP3+**) | Section controllers of the Painel shell, one file per section. Today they live in `profile/`; each moves to `sections/` when its work package rebuilds it. | Reusable components, API transport. |
| `web/public/script/editor/`, `web/public/script/render2/` | The editor's parts and the 3D renderer. Each has its own rules (see `GUIDE.md`). | Anything the rest of the site imports except through their documented entry module. |
| `web/public/css/` | `tokens.css`, the primitives in `css/components/`, and one sheet per page or feature. | Values that are not tokens; a second palette. |

### Why `services/` and not another `controllers/`

node-aec keeps page controllers in `components/` and API access in `model/`. That works when a controller
is a DOM thing. gladCode's current `profile/session.js` shows the gap: it holds the signed-in user, the XP
rule and the badge helpers, and it also writes `#menu` markup — so every section that needs the account
must run inside that page, and a unit test has to fake the DOM to test a level rule.

`services/` separates the third responsibility: **state that outlives one component and is interesting to
several of them**, with no DOM. It sits between `models/` (API) and `components/`/sections (DOM). The
rules are:

- a service may import models and helpers; it must not import a component or a template;
- a service never reads or writes the DOM and never receives an element;
- a service exposes async methods and emits app events ([events.md](events.md)) when its state changes;
- the page entry creates the service (or imports its singleton) and passes it to the sections;
- a service that loads data accepts an `AbortSignal` so a section can cancel it when it closes.

## 2. Modules

- **Native ES modules, named exports.** No default exports, no CommonJS, no bundler. Load page entries with
  `{{#module}}name.js{{/module}}` after `{{{importMap}}}`.
- **Import through the map.** Inside `web/public/script/` import with relative paths
  (`../helpers/html.js`); the import map versions the resolved URL. Never hard-code `/script/...` in a
  module. A new script folder goes into `MODULE_DIRS` in `web/helpers/modules.js`.
- **No globals.** Nothing is published on `window` except the replay facade in `playback.js`
  (`exposeLegacyGlobals`), which exists for the classic `render.js` and `render2/`. New code never adds to
  that list.
- **No jQuery.** Use the DOM APIs and the helpers in `helpers/animate.js` (`fadeIn`, `fadeOut`,
  `slideDown`, `show`, `hide`, `animateValue`).
- **No native dialogs.** Never `alert`, `confirm` or `prompt`; use `components/dialog.js`
  (`showDialog`, `showMessage`, `showInput`, `showTextArea`, `showTerminal`) and
  `components/toast.js` (`createToast`).
- **No application data in the DOM.** Do not put data in `data-*` attributes or `dataset`; keep a `Map`,
  a `WeakMap` or a class field. `data-*` is allowed only as a behaviour hook with a fixed value (the
  current `data-menu` section marker is legacy and disappears with the redesign). Never encode a value
  that comes from the server.
- **Escape by default.** Build markup with `renderTemplate` (`{{key}}` escaped, `{{{key}}}` raw for
  markup the code built itself) or `textContent`; escape user text inside dialog and toast messages
  (`escapeHtml`). Never concatenate server or user text into HTML.
- **JSDoc on every exported class, function and method**, with `@param`, `@returns` and `@throws` where
  they matter. Follow the existing style: a short purpose sentence, then the contract.
- **No inline styles except dynamic geometry** (positions, a progress width, the width a busy button
  keeps). Visual states are classes: `is-loading`, `is-progress`, `is-placeholder`, `flash`, `is-open`.
- **A new helper is importable under Node.** If it needs `document` or `window`, it is a component or a
  page entry. The theme choice and the glad-view choice are the only shared helpers that touch the root
  element, because they own it; the event bus is DOM-free.
- **Listeners and timers are released.** Components use `BaseComponent#on`; page entries and sections keep
  an `AbortController` and pass its signal to requests and the event bus; `setInterval`/`setTimeout` are
  cleared on unmount.

## 3. Naming

| Thing | Rule | Example |
| :--- | :--- | :--- |
| File | kebab-case, named after the class or page | `app-header.js`, `notifications-panel.js`, `glad-card.js` |
| Class | PascalCase, one per file | `AppHeader`, `GladiatorCard`, `PotionSlot` |
| Function / method | camelCase, verb first | `loadSection`, `setError`, `abort` |
| Constant | `UPPER_SNAKE_CASE`, module scope | `NOTIFICATIONS_MS`, `SPRITE_POSES` |
| CSS component root | the file's kebab-case name | `.app-header`, `.gladiator-card` |
| CSS part | `.component-part` | `.app-header-nav`, `.gladiator-card-stage` |
| CSS state | `is-*` | `.is-loading`, `.is-open`, `.is-selected` |
| CSS variant | a modifier class with no prefix | `.primary`, `.compact`, `.danger` |
| App event | `domain:action`, past tense for a fact | `account:saved`, `messages:read` |
| Component event | short verb, lower case | `select`, `change`, `save`, `undo`, `close` |

CSS variables stay as `tokens.css` defines them. New content colours follow `--color-<meaning>` and are
declared once in `tokens.css`; theme roles are declared in the three theme blocks.

## 4. File size and structure

| Kind | Target | Split when |
| :--- | :--- | :--- |
| Page entry | ≤ 80 lines | It renders markup, calls models or holds state |
| Section controller | ≤ 400 lines | It owns two independent jobs or builds reusable markup |
| Component | ≤ 250 lines | It has more than one root element or a second responsibility |
| Helper / service | ≤ 200 lines | It exports unrelated things |
| Template module | any length | It holds logic (it never should) |
| Component stylesheet | ≤ 250 lines | It styles a second component |

These are targets for new and refactored code. Existing files above them (for example
`profile/tournaments.js` and `profile.css`) are split by the section that touches them, not in a separate
"cleanup" change.

## 5. CSS ownership

- **Tokens only.** Colours, fonts, sizes (`--text-*`), spacing (`--space-*`), radii, shadows, durations and
  layers come from `var(--…)`; tints use `color-mix(in srgb, var(--color-…) 30%, transparent)`. One-off
  geometry of a single component (a width, a height, a large offset) may stay literal; a dimension two
  sheets share becomes a `--layout-*` token.
- **One stylesheet per component** in `web/public/css/components/`, named after the component. The
  primitives (`button`, `field`, `surface`, `empty-state`, `code`) are loaded on every page by
  `web/view/head.html`; shell and section components are loaded by the shell or the page that uses them.
- **Page sheets add placement only.** Widths, margins and where a component sits belong to the page;
  colours, typography, hover and disabled states belong to the component or primitive.
- **Themes.** Every role exists in Arena light, Arena dark and Classic; content colours (game bars,
  attributes, medals, card frames, status seals) are defined once and never follow the theme. See
  [docs/design-system.md](../design-system.md).
- **Native nesting** in component sheets (`&:hover`, `&.primary`); a component that sets `display` keeps
  `&[hidden] { display: none; }`.
- **Mobile first.** Base rules for phones, then `@media only screen and (min-width: <n>px)`. The common
  steps are 600, 800 and 900 px; older sheets also use 560, 640, 720, 860, 980 and the 1000–1600 range —
  reuse a step before adding one.
- **No `!important`** except where an existing rule overrides a library or an inline style.
- Files are LF without trailing whitespace; `git diff --check` passes.

## 6. Accessibility

- **Real elements.** A control is a `<button>` or an `<a href>`, never a `<div>` with a click. If a
  non-button must be clickable (an upload drop zone), give it `role="button"`, `tabindex="0"` and the
  Enter/Space handlers, as a last resort.
- **Targets are at least 44 × 44 CSS px** for a pointer (the boards draw icon buttons from 34 to 44 px;
  the implementation gives every icon-only control a 44 px hit area, visually smaller if the design needs
  it). A link inside a sentence may be smaller.
- **Current state.** Navigation uses `aria-current="page"`; toggles use `aria-pressed`; tabs use
  `role="tab"`, `aria-selected` and `aria-controls`; switches use `role="switch"` and `aria-checked`;
  menus/sheets set `aria-expanded` on the trigger and `aria-controls` to the panel.
- **Dialogs, sheets and the palette** use `role="dialog"`, `aria-modal="true"`, a labelled heading, focus
  moved into the panel, Tab kept inside it, Esc closes it and focus returns to the trigger. `dialog.js`
  sets the role, the modal flag and the initial focus today; WP2 adds the focus trap, the Esc handler and
  the focus return to `Message`, and the sheet and the palette follow the same contract.
- **Focus is visible** through `:focus-visible` and the focus-ring tokens; never remove an outline without
  a replacement.
- **Live feedback.** Toasts and counters announce through `role="status"`/`aria-live="polite"`; an error
  that blocks an action uses `role="alert"`.
- **Reduced motion.** `tokens.css` cuts transitions and animations under `prefers-reduced-motion`; a new
  animation must be a CSS transition/animation (so the rule catches it) or check the media query.
- **Icons** are decorative (`aria-hidden="true"`) when the label is visible; an icon-only button carries
  an `aria-label` and a `title` (promoted to a tooltip by `components/tooltip.js`).
- **Forms**: every field has a `<label for>` (or `aria-label` when the visual label is elsewhere); an
  invalid field is `aria-invalid` with the error text next to it — the section renders the text,
  `Field#setError` keeps the message and moves focus.

## 7. Loading data and errors

- Sections ask a **service**; services ask a **model**; models use `api.get|post|put|delete`. Pass
  `{ signal }` from the section's `AbortController` and, for battle calls, `{ timeout: BATTLE_TIMEOUT_MS }`.
- Branch on `RequestError.code` (e.g. `NOT_SIGNED_IN`, `NICKNAME_TAKEN`, `NO_FREE_SLOT`,
  `GLADIATOR_LIMIT`) with a specific Portuguese message for each code the route throws, plus a general
  fallback. `RequestError.details` carries the API's `data` payload.
- A refused field is marked with `Input#setError`/`Select#setError`.
- A request aborted because the section closed (`RequestError.aborted`) is not an error to show.
- Loading, empty and error are first-class states of every section; see [pages.md](pages.md).

## 8. How a page and a component are tested

There is no browser test runner in the repository; the layers are tested at the boundaries:

| Layer | Test | Where |
| :--- | :--- | :--- |
| Pure helper (dates, maths, parsing, event bus, service reducers) | `node:test`, plain imports | `tests/frontend/*.test.mjs` (`npm test`) |
| Component DOM behaviour | `node:test` with a hand-built fake element exposing only what the component touches (see `tests/frontend/components.test.mjs`) | `tests/frontend/` |
| Page routes, redirects, import map | `node:test` against the Express app | `web/tests` (`docker compose exec -T web npm test`) |
| API contract used by a model | Vitest with a mocked MySQL | `api/tests/unit` |
| The 3D renderer's pure logic | `node:test` | `tests/render2/` |

A new pure helper gets a test in the same change. A component gets a test when it owns state or an async
action (busy, error, retry, undo); a purely presentational component is covered by the page's browser pass.

**Before finishing**, run the lint and test gate in [TESTING.md](../../TESTING.md), then open the page on
<http://localhost:8085> in Arena light, Arena dark and Classic at phone and desktop widths, signed in
locally (`docker compose exec -T api node scripts/issue-session.js <id>`).
