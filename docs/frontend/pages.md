# Pages and the Painel shell

How a page is put together, how the nine Painel sections are routed and mounted, and what happens on a
phone. This is the contract WP3–WP9 implement; today's code is named where it differs.

## 1. Today and the target

Today every route renders its own Mustache view and loads its own entry module. The profile is one view
(`web/view/profile.html`) containing all nine sections; `web/public/script/profile.js` mounts one
controller per section from `web/public/script/profile/` and toggles `.content.open` on the matching
panel. Clicking a menu entry does not change the URL.

The target keeps the server routes and the single shell view, and changes four things:

1. the shell markup is the header partial + the Painel menu + one content column (no in-menu footer);
2. menu entries are real links; the shell has **one route resolver** shared by the first load, clicks and
   `popstate`, pushes a history entry on a section change and mounts the section from the resolved state
   (a cold load or a modified click still does a full navigation, so the server route is the source of
   truth);
3. each section has one lifecycle (mount, unmount, abort) and real loading, empty and error states;
4. the phone gets a bottom tab bar and a “Mais” sheet instead of the rail.

The `<head>` stays the site head: `{{> head}}` (tokens, primitives, `theme-boot.js`), the import map, and
the page entry after it. No section renders its own `<html>` shell.

## 2. Routes

The Painel sections keep their addresses; the shell maps a route to a section id. The section modules live
in `profile/` today; the target is `sections/`, and each one moves when its work package rebuilds it (the
module column names today's file).

| Section | Route(s) | Section id | Section module | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Notícias | `/news` | `news` | `profile/news.js` | The first entry and the shell's landing section; the header's “Painel” link opens it (WP3). |
| Perfil | `/profile`, `/profile?t=profile` | `profile` | `profile/settings.js` | Unknown or disabled tabs fall back to Perfil (today's `openableTab`). |
| Gladiadores | `/glads` | `glads` | `profile/glads.js` | |
| Poções | `/potion` | `potions` | `profile/potions.js` | The menu says Poções; the route keeps the old singular. |
| Batalhas | `/battle`, `/battle.<mode>` | `battle` | `profile/battle.js` + `ranked.js`, `duels.js`, `tournaments.js`, `trainings.js` | `<mode>` is `ranked`, `duel`, `tourn` or `train`. |
| Relatórios | `/reports` | `report` | `profile/reports.js` | The section id is `report` (today's menu id); `/reports` is the canonical URL. |
| Ranking | `/ranking`, `/ranking?at=<position>` | `ranking` | `profile/ranking.js` | `?at=` opens the ranking around the resolved position (`window.position`) and reveals it. |
| Mensagens | `/messages`, `/messages/<userId>` | `messages` | `profile/messages.js` | `<userId>` is the other master's id; the open conversation is part of the URL (WP8). |
| Amigos | `/friends` | `friends` | `profile/friends.js` | |
| Any section (legacy tab) | `/profile?t=<tab>` | resolved from `t` | same as the named section | `t` names the section (`news`, `glads`, `potions`, `battle`, `report`, `ranking`, `messages`, `friends`); `?s=` sets the battle subtab. Unknown/disabled falls back to Perfil. |
| Sair | `/logout` | — | — | Not a section: the account menu's “Sair” signs out and leaves; if the logout request is refused the page stays and a toast offers “Tentar novamente”. The old route still works. |

`web/app.js` `PROFILE_TABS` is the server side of this table: its **keys** are the route names (`news`,
`glads`, `reports`, `battle`, `potion`, `ranking`, `messages`, `friends`, `logout`) and its **values** are
the section ids (`news`, `glads`, `report`, `battle`, `potions`, `ranking`, `messages`, `friends`,
`logout`). Keep it in step: a route that exists must answer the shell, and a section id that the menu shows
must have a route. WP8 registers `/messages/:userId` as a page route before the catch-all; the resolver
reads `userId` from the path. `/ranking?at=` needs no new route.

### The route resolver (WP3)

One function, `resolveRoute(url)`, is the only place a URL becomes a shell state. It returns:

```js
/**
 * @typedef {object} PainelRoute
 * @property {'news'|'profile'|'glads'|'potions'|'battle'|'report'|'ranking'|'messages'|'friends'} section
 * @property {string} subtab `''` or a battle mode (`ranked`, `duel`, `tourn`, `train`).
 * @property {{ at?: number, q?: string, userId?: number }} query The section-owned query values.
 */
```

- `/news`, `/glads`, `/potion`, `/battle`, `/reports`, `/ranking`, `/messages`, `/friends` map to their
  section ids (`report` for `/reports`).
- `/battle.<mode>` sets `subtab`; a `/profile?t=battle&s=<mode>` legacy URL resolves to the same state.
- `/profile?t=<tab>` resolves the section from `tab` (`report`, `potions` accepted alongside the route
  names), then `?s=` as the subtab; an unknown or disabled tab resolves to `profile`.
- `/ranking?at=<n>` sets `query.at` (a positive integer, else ignored); `/ranking?q=` sets `query.q`.
  `/messages/<userId>` sets `query.userId` (WP8).
- Any other path is not a Painel route; the server's own redirects (old addresses) run first, and the shell
  only intercepts links whose resolved state has a `section`.

`sectionUrl(state)` builds the canonical URL back (`/news`, `/battle.duel`, `/ranking?at=128`,
`/messages/7`); the shell never writes a URL the resolver cannot read.

**Navigation rules:**

| Trigger | Behaviour |
| :--- | :--- |
| First load | `mount(resolveRoute(location))`; **no** `pushState`, no focus move. |
| Left click on a same-origin section link (no modifier) | `event.preventDefault()`, `navigate(resolveRoute(href), { push: true })`. |
| Menu and tab bar (always inside the Painel) | the same `navigate(state, { push: true })`. |
| Palette result | if the current page is the Painel shell **and** the result's `section` is not null, `navigate(resolveRoute(href), { push: true })`; otherwise `location.assign(href)` — a public page or a document target has no Painel content to mount. |
| `popstate` (Back/Forward) | `mount(resolveRoute(location))` with `{ fromHistory: true }`; **no** `pushState` and no new entry. |
| In-section state change (filters, pagination, the ranking jump) | the section applies it and emits its fact; the shell calls `navigate(state, { historyOnly: true, replace: true })` for filters/pagination and `{ historyOnly: true, push: true }` for the ranking jump and for opening a conversation, so Back returns to the previous window without a duplicate request |

`navigate(state, { push, replace, historyOnly })` calls
`history.pushState({ painel: state }, '', sectionUrl(state))` (or `replaceState`). When `historyOnly` is
false, it then `mount`s or `update`s the section: `mount` after a section change, `update` when only the
subtab or the query changed. `mount` unmounts the current section, mounts the next one, sets the active menu
entry and the title, scrolls the content to the top and moves focus to the section's `<h1>` only when the
change came from a click, a shortcut or `popstate` — never on the first load or an in-place `update`. Back
and Forward restore section, subtab and query because the resolver reads them from `location`.

The shell decides the navigation kind by **where it is mounted**, not by the target alone: a page outside
the Painel (the front page, `/manual`, `/editor`, …) has no `#painel-content`, so a palette
result always leaves it with `location.assign(href)`. Only a palette opened on the Painel can mount a
section in place.

### Old addresses

`web/helpers/urls.js` `legacyPageUrl` maps every old PHP address, with or without `.php`, to the routes
above (and to the other pages). The catch-all `/:page` redirect is registered **after** every page route,
so a page that a legacy address maps to must be registered before it. The redirects tested in
`web/tests/routes.test.js` are the contract: `/profile.php?t=battle&s=duel` → `/profile?t=battle&s=duel`,
`/playback.php?log=<hash>` → `/play/<hash>`, `/tournament.php?h=<hash>&r=2` → `/tourn/<hash>/2`,
`/editor.php?g=5` → `/glad-5`, `/function.php?f=attack&l=pt&p=c` → `/funcao/attack.c`, and so on.

### Pages outside the Painel

The header is shared by every public and account page (`about`, `creditos`, `docs`, `docs-ptbr`,
`docs-blocks`, `manual`, `stats`, `post`, `function`, `editor`, `newglad`, `glad-<id>`, `tourn`, `train`,
`update`, `thanks`, the 404 and the front page), but the **rail and the phone tab bar belong to the Painel
only**. The replay page (its own replay chrome) and the dev-tools cockpit (its own admin header) do not use
the site header. A public page keeps its own content column and footer and gets the redesigned header
(WP3), not the sections.

## 3. The shell

```text
<body>
  {{{templateVars}}}
  {{> header}}                         the AppHeader partial (no section markup)
  <div id="painel">                    the shell grid
    <aside id="painel-menu">           PainelMenu (identity card + sections)
    <main id="painel-content">         the mounted section
  </div>
  <nav id="painel-tabs">               MobileTabBar (phones only)
  <aside id="painel-more">             MoreSheet (phones only, hidden until opened)
</body>
```

- **Header**: `64px` on desktop, `56px` on the phone, `position: sticky` (or fixed with a spacer) and the
  same ink/blue chrome in every theme, per the boards. It contains the logo, the primary nav, the search
  entry (the field ≥ 900 px, an icon below), the Batalhar CTA, the silver chip, the bell and the avatar.
- **Menu**: `264px` wide, the page's neutral chrome (`--color-chrome`), sticky under the header and
  scrolling on its own when the viewport is short. The identity card at the top (Avatar + nickname +
  master level + XP bar + link to Perfil), then Notícias, PREPARAÇÃO (Gladiadores, Poções), ARENA
  (Batalhas, Relatórios, Ranking), COMUNIDADE (Mensagens, Amigos), then “Novo gladiador”, the shortcut
  hint and the engine version.
- **Content**: one column, `max-width: 1080px`, centred, `padding: 40px 48px 64px` on desktop; the section
  owns the inside. The page never scrolls horizontally: a wide table scrolls inside its card.
- **No footer in the shell**: the boards do not show one, and the menu's old footer is gone. Public pages
  keep `{{> footer}}`.
- **Skip link**: “Pular para o conteúdo” is the first focusable element, moving focus to `#painel-content`.

### Layout breakpoints

| Width | Shell |
| :--- | :--- |
| `≥ 900px` | Full rail with labels, badges and the identity card; header search field visible; content padding 40/48. |
| `600–899px` | Icon rail (72 px): each entry is its icon tile with a tooltip, a badge dot for counts and `aria-label`; the identity card collapses to the avatar button that opens the account menu; the header keeps the logo, search icon, bell and avatar. |
| `< 600px` | No rail: the MobileTabBar (Notícias, Gladiadores, the raised Batalhar, Relatórios, Mais) and the MoreSheet. Header 56 px: logo, search icon, bell dot, avatar. Content padding 20/16, bottom padding clears the bar and `env(safe-area-inset-bottom)`. |

The steps reuse the site's 600/800/900 media steps; the rail change is at 900 because the 264 px rail
would leave too little content below it (the boards' content is 1074 px wide at 1440).

### Phone details

- The bottom bar has five entries; the middle one (Batalhar) is raised and keeps a 44 px hit area.
- Entries carry their counts as text badges (a dot when the count is not shown) and `aria-current`.
- **Mais** opens a modal sheet with the identity card, the six remaining tiles (Poções, Ranking,
  Mensagens, Amigos, Notícias, Ajustes) with counts, and the Editor / Aprender / Sobre links. The sheet
  closes on the scrim, on Esc and on a selection.
- A two-pane section (Mensagens) shows the list first; selecting a conversation replaces it with the
  thread and a back button. Amigos and Ranking tables scroll inside their cards.
- The content column's bottom padding includes the bar height (`calc(78px + env(safe-area-inset-bottom))`).

## 4. Section lifecycle

A section module exports a factory:

```js
/**
 * @param {{
 *   element: HTMLElement,
 *   services: { account, notifications, shell },
 *   events: import('../helpers/event-bus.js').events,
 *   route: PainelRoute,
 * }} context
 * @returns {{ mount(route): Promise<void>, update?(route): Promise<void>, unmount(): void }}
 */
export function createNewsSection(context) { … }
```

WP3 adapts the existing controllers to this shape; WP4–WP8 rewrite them section by section. The contract:

1. **Mount.** The shell resolves the route, and when the section id changes it unmounts the old section and
   calls `mount(route)`. The shell marks the content `aria-busy="true"`, shows the section's skeleton (or
   its `SectionCard` in the loading state), and the section creates one `AbortController`, passes its
   signal to every request and to `events.on`, and registers its timers.
2. **Update in place.** When only the subtab or the query changes (`/battle.duel` → `/battle.ranked`,
   `/ranking?at=128`, `/messages/7`), the shell calls the mounted section's `update(route)` instead of
   remounting it. The section aborts the requests it no longer needs, applies the new filter/window and
   keeps its scroll position and the components it already owns.
3. **Load and render.** Data comes from a service; the section renders through components and templates.
   The first paint never waits for a secondary request (the page header and the section chrome show while
   the list loads).
4. **Unmount.** The shell calls `unmount()` before mounting a different section: abort the controller,
   clear timers and intervals, `destroy()` the components it owns, remove its listeners, cancel the
   countdowns. A late response after `unmount()` is ignored (`RequestError.aborted` is not shown).
5. **Navigation.** On mount the shell sets `document.title` (`gladCode - <section>`), updates the active
   entry (`navigation:opened`), scrolls the content to the top, and moves focus to the section's `<h1>`
   (`tabindex="-1"`) **only when the change came from a click, a shortcut or `popstate`** — not on the
   first load and not on an in-place `update`.
6. **No section owns the page.** A section never reads or writes another section's DOM, never calls
   `location.reload()`, never calls `history` directly (the shell owns the resolver and the history) and
   never leaves a global behind.
7. **One mounted section.** The shell mounts one section at a time and keeps the previous one's state only
   if that section chooses to cache it in its service (the news list, for instance); the default is a
   fresh mount after a section change.

## 5. States

Every section renders the same three states through `SectionCard`:

- **Loading**: `aria-busy="true"`, a skeleton in the shape of the content (no spinner over an empty page),
  buttons disabled. A request that takes longer than 300 ms shows the skeleton; a faster one paints the
  content directly.
- **Empty**: `emptyStateTemplate` with an icon, a title, a one-line summary and one action (for example
  “Nenhum gladiador ainda” → “Novo gladiador”). The empty state is not an error and never blames the user.
- **Error**: the same card with a short message, the API's message when it is useful, and a “Tentar
  novamente” button that re-runs the request. `NOT_SIGNED_IN` sends the visitor to
  `/?login=<section>`; a refused action keeps the user's input and marks the field.

Partial states are allowed: a section can show its header and an empty list while a secondary panel (the
aside, the counts) loads. A failed secondary request degrades quietly; a failed primary one uses the error
state.

## 6. Keyboard and shortcuts

- `Ctrl K` / `⌘K` opens the CommandPalette from anywhere in the shell; `/` opens it with the query field
  focused, except inside an input or textarea.
- `G` then a section initial jumps to it: `N` Notícias, `P` Poções, `B` Batalhas, `R` Relatórios,
  `K` Ranking, `M` Mensagens, `A` Amigos. Gladiadores and Perfil are reachable through the menu and the
  palette (their initials collide with the prefix and with Poções). The shell shows the pending `G` state
  and cancels it after a second.
- `?` opens the shortcuts window; `Esc` closes the palette, the account menu, the notifications panel,
  the sheet and any dialog.
- Every shortcut has a visible equivalent (menu entry, button or palette item); no feature is
  keyboard-only.

## 7. What the section provides to the shell

| Value | Used by |
| :--- | :--- |
| `title` and `subtitle` | `document.title`, the page header, the palette's recent list |
| `id` (the section id) | the active menu entry, the tab bar, `navigation:opened` |
| the sections it can navigate to (`href`) | the shell's interception of same-origin links |
| its preferred badge source | the menu and the tab bar read the counts from `NotificationService`, not from the section |

The section does **not** provide the header, the menu, the tab bar or the shell layout. It renders inside
`#painel-content` and nothing else.
