# Frontend conventions — the delivered Painel

This folder is the frontend contract of gladCode 2 and the record of the Painel redesign (WP2–WP9).
It is also the rule set for any new page: the redesign is delivered, so every component, event and
page shape described here exists unless a section explicitly says otherwise.

Read in this order:

1. [conventions.md](conventions.md) — which folder owns what, module and naming rules, CSS ownership,
   accessibility and how a page is tested.
2. [components.md](components.md) — the catalogue: every reusable page element, its API, events,
   stylesheet, the boards that show it and its final status.
3. [events.md](events.md) — component events and the app event bus, with the end-to-end flows.
4. [pages.md](pages.md) — the page shell, section routing and lifecycle, states and the phone layout.

The visual target is [docs/design/painel/](../design/painel/README.md) (the boards and the live canvas).
The board-by-board audit is [docs/design/painel/FIDELITY.md](../design/painel/FIDELITY.md). The
direction is [DESIGN.md](../../DESIGN.md); the tokens, themes and primitive styles are
[docs/design-system.md](../design-system.md). This folder never replaces those: it says how the code is
arranged, they say what it looks like.

## Implemented shape

The repository has one page shell per route and the profile shell (`web/view/profile.html`) with nine
client-side sections. Its page entry, `web/public/script/profile.js`, mounts one controller per section
from `web/public/script/profile/`. There is no build step: native ES modules load through an mtime
import map (`web/helpers/modules.js`), and styles are plain sheets loaded by each view.

The finished redesign keeps those foundations and adds:

- the shared **header** on every page that shows it (`{{> header}}`) and the **Painel shell** (Painel
  menu + phone bottom bar + “Mais” sheet) on the nine Painel sections;
- the component catalogue ([components.md](components.md)); one file and one stylesheet per element,
  composed from the WP2 primitives;
- DOM-free `services/` for application state that survives a section change and
  `helpers/event-bus.js` for app events ([events.md](events.md));
- one lifecycle for a section (mount, unmount, abort in-flight requests) and one set of states
  (loading, empty, error) ([pages.md](pages.md));
- one theme source (`tokens.css` roles), one phone breakpoint and the accessibility contract
  (focus rings, labels, dialog/sheet/palette focus traps, reduced motion).

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
| `controllers` mixed into `components/` | Page entries, section controllers in `profile/`, plus `services/` for DOM-free state | Controllers that both talk to models and write the DOM are the reason `profile/session.js` existed; `services/` gives state a home that the DOM can subscribe to. |
| `Form` composing `Button`/`Input`/`Select` | Sections compose the primitives; no generic `Form` | The Painel forms are small (search, composer, settings) and autosave; a generic form would not earn its API. |

## Delivered work packages

| WP | Delivered |
| :--- | :--- |
| WP2 | Tokens for the game surfaces, UI primitives, `helpers/event-bus.js`, `services/`, the component gallery, unit tests |
| WP3 | AppHeader, AccountMenu, NotificationsPanel, CommandPalette, PainelMenu, MenuItem, MobileTabBar, MoreSheet, global search and the shell/phone frame |
| WP4 | Notícias and Perfil with autosave and the undo toast, the featured post and “Aguardando você”, the identity hero and preferences |
| WP5 | Gladiadores (game cards, filters, free slot, phone list) and Batalhas (mode cards, pending invite, ranked picker, VersusPanel, duel/tournament/training flows) |
| WP6 | Poções (apothecary and shop) and Relatórios (form streak, tabs, unread switch, report table, pager) |
| WP7 | Ranking (own-gladiator jump, centred window, numbered pagination, go-to-position) and its API |
| WP8 | Mensagens (two-pane conversations, replay cards, composer, phone split) and Amigos (invites, online state, search) and their API |
| WP9 | Phone/theme/accessibility audit, board fidelity, cleanup, documentation sync and full gates |

## Redesign changelog

- **Shell.** Every page now renders the same `AppHeader`; signed-in pages use the Painel rail or, at
  phone width, the five-entry bottom bar and the “Mais” sheet. The shell owns routing, notification
  counts and the global command palette; sections never build navigation.
- **Sections.** Notícias, Perfil, Gladiadores, Poções, Batalhas, Relatórios, Ranking, Mensagens and
  Amigos were rebuilt from their boards. The old tab controllers, menu markup and the dead legacy
  message/friend/login-menu styles were removed; the tournament, training and battle flows keep their
  data layer behind the new cards.
- **Conversations.** Mensagens groups the existing `messages` rows by the other master (no rewrite),
  pages threads by 30, marks a conversation read per master and emits `messages:read`; Amigos carries
  presence from `usuarios.ativo` (five-minute window, once-a-minute touch), best gladiator/renown and
  mutual counts.
- **Platform.** Components follow the catalogue contract, app state goes through `services/` and app
  events, every page is checked in Arena light, Arena dark and Classic, and the phone layout keeps
  44 px touch targets with safe-area insets.
- **Documentation.** The frontend contract, design board mapping, API reference, README/GUIDE/TESTING
  and project skills describe the delivered tree; the board audit is
  [FIDELITY.md](../design/painel/FIDELITY.md).
