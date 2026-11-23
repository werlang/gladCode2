# Frontend conventions — the Painel redesign contract

This folder is the frontend contract for gladCode 2. It is written for the Painel redesign (WP2–WP9 of
`.orchestration/PLAN.md`): WP2 builds the primitives and the event bus described here, WP3 the app shell,
and WP4–WP9 rebuild the nine sections. It is also the rule set for any new page from now on.

Read in this order:

1. [conventions.md](conventions.md) — which folder owns what, module and naming rules, CSS ownership,
   accessibility and how a page is tested.
2. [components.md](components.md) — the catalogue: every reusable page element, its API, events,
   stylesheet, the boards that show it, and whether it exists today or which WP builds it.
3. [events.md](events.md) — component events and the app event bus, with the end-to-end flows.
4. [pages.md](pages.md) — the page shell, section routing and lifecycle, states and the phone layout.

The visual target is [docs/design/painel/](../design/painel/README.md) (the boards and the live canvas).
The direction is [DESIGN.md](../../DESIGN.md); the tokens, themes and primitive styles are
[docs/design-system.md](../design-system.md). This folder never replaces those: it says how the code is
arranged, they say what it looks like.

## What is true today, and what is planned

The repository today has one page shell per route and the profile shell (`web/view/profile.html`) with
nine client-side sections. Its page entry, `web/public/script/profile.js`, mounts one controller per
section from `web/public/script/profile/`. There is no build step: native ES modules load through an
mtime import map (`web/helpers/modules.js`), and styles are plain sheets loaded by each view.

The redesign keeps those foundations and adds:

- a shared **header** used by every page that shows it (`{{> header}}`), and the **Painel shell**
  (Painel menu + phone bottom bar + “Mais” sheet) used only by the nine Painel sections;
- a component catalogue ([components.md](components.md)) with one file and one stylesheet per element;
- a DOM-free `services/` folder for application state that survives a section change, and
  `helpers/event-bus.js` for app events ([events.md](events.md));
- one lifecycle for a section (mount, unmount, abort in-flight requests) and one set of states
  (loading, empty, error) ([pages.md](pages.md)).

Anything marked **planned** below or in the catalogue is not in the tree yet; the WP that builds it is
named. Anything unmarked exists and is the current code.

## The model, in one paragraph

A **page entry** loads, mounts the shell and the section controllers. A **section controller** owns one
section: it asks a **service** for data, renders it through **components** and **templates**, and releases
everything when the section closes. A **component** owns one element and its DOM behaviour; it never calls
the API. A **service** owns application state (the account, notification counts, an open section), calls
**models**, and emits app events. A **model** is the only code that calls the API. A **helper** is DOM-free
and testable in isolation. A **template** is a markup string with placeholders and no logic.

## Relation to node-aec

The documentation shape and the frontend boundaries mirror
[node-aec](https://github.com/nodeaec): `GUIDE.md` for architecture, `TESTING.md` for validation,
`.agents/skills/frontend-development` as the short agent pointer, `components/` for DOM behaviour,
`model/` for API access, `helpers/` for infrastructure and `templates/` for client markup.

gladCode departs in four places, each deliberate:

| node-aec | gladCode 2 | Why |
| :--- | :--- | :--- |
| Webpack bundles with `src/js` and `src/css` | Native ES modules with an mtime import map, `web/public/script` and `web/public/css` | No build step: a deploy busts caches by modifying files, and the classic renderers stay classic scripts. |
| i18next locales in the browser | Portuguese copy written in the templates | The site is pt-BR only; no translation runtime is needed. |
| `controllers` mixed into `components/` | Page entries + section controllers in a folder per shell (`profile/` today, `sections/` as the Painel redesign moves them), plus the new `services/` for DOM-free state | Controllers that both talk to models and write the DOM are the reason the current `profile/session.js` reaches into markup; `services/` gives state a home that the DOM can subscribe to. |
| `Form` composing `Button`/`Input`/`Select` | Sections compose the primitives; no generic `Form` yet | The Painel forms are small (search, composer, settings) and autosave; a generic form would not earn its API. |

## Status of the work packages

| WP | Delivers | Documents that become code |
| :--- | :--- | :--- |
| WP2 | Tokens for the game surfaces, UI primitives, the catalogue's shared components, `helpers/event-bus.js`, `services/`, unit tests | conventions.md, components.md (shared entries), events.md |
| WP3 | AppHeader, AccountMenu, NotificationsPanel, CommandPalette, PainelMenu, MenuItem, Badge, MobileTabBar, MoreSheet, SearchField, Avatar, global search; the shell's notification reads: `GET /news?markRead=false` (opt-in, so the bell never advances the news marker) and `GET /potions/slots` with `expiresAt`/`serverNow` | components.md (shell entries), pages.md, events.md flow 1 |
| WP4 | Notícias and Perfil with autosave and the undo toast; `GET /news` defaults to `markRead=false` and `POST /news/read` | components.md (PageHeader, SectionCard, SaveStatus), events.md flows 2 and 9 |
| WP5 | Gladiadores and Batalhas | components.md (GladiatorCard, GladiatorPicker, VersusPanel), events.md flows 3 |
| WP6 | Poções and Relatórios | components.md (PotionSlot, PotionCard, ResultPill, FormStreak), events.md flow 7 |
| WP7 | Ranking | components.md (RankingTable, OwnGladiatorJump), events.md flow 4 |
| WP8 | Mensagens and Amigos | components.md (ConversationList, MessageThread, Composer, FriendRow, InviteBanner), events.md flows 5–6 |
| WP9 | Phone pass, three-theme pass, accessibility pass, docs sync, browser audit | all of them |
