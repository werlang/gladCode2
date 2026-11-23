# Painel redesign — design boards

The boards in this folder are the visual target of the Painel redesign (PLAN: `.orchestration/PLAN.md`,
work packages WP1–WP9). Each `.dc.html` file is the source of one board, exported from the design canvas;
`canvas.json` is the canvas layout that places them. The browsable version is the live canvas:
<https://claude.ai/artifact/3ZpFREySqX238vTF3ER3fn>.

The boards are static drawings: they reference the canvas runtime `./support.js` (not exported, so a
local board shows unstyled placeholders until the `{{…}}` values are filled by that runtime) and use
fixed colours on purpose. `docs/frontend/conventions.md` and `docs/design-system.md` own how those
colours become tokens; this file maps each board to the code that will implement it.

Every board is drawn in **Arena light**. The same layout is implemented with role tokens, so Arena dark
and Classic keep working:

- The header and the Painel rail are **chrome**, not page content: the canvas draws them ink
  (`#08151f`/`#0b1d2b`) for both Arena themes and brand blue (`#00638d`/`#004e70`) for Classic. In code
  they use `--color-header-bg`, `--color-header-text`, `--logo-filter`, `--color-chrome`,
  `--color-brand`, `--color-brand-hover`, `--color-text-on-brand` and the accent/action roles.
- Page surfaces (`#f5efe2` page, `#fffdf8` cards, `#f0e6d2` insets, `#dfd0b2`/`#ece1c9` borders,
  `#08151f`/`#1b2a35`/`#34444f`/`#56636b` text) become `--color-page`, `--color-surface`,
  `--color-surface-alt`/`--color-surface-sunken`, `--color-border`, `--color-text`,
  `--color-text-strong`, `--color-text-muted` and `--color-text-subtle`.
- Arena dark is the **same ink chrome over night surfaces**: the card and panel colours become the
  Arena-dark roles (ink page and raised surfaces, mist text, sand titles); no layout changes.
- Classic is the brand-blue chrome over the light grey workshop page (`#edf1f3`) and white cards; the
  display font switches from Cinzel to Acme through `--font-display`.
- The game surfaces keep their meaning in every theme: glass/bars (`--color-hp`, `--color-ap`,
  `--color-xp`), attributes (`--color-str`, `--color-agi`, `--color-int`), medals
  (`--color-medal-*`) and the profile-menu category colours (`--color-cat-*`). New game surfaces the
  boards introduce (gladiator-card frames and stages, status seals, the gold "Batalhar" bevel, potion
  compartment tints, form streaks) become **content tokens** in `tokens.css` in WP2, not literals in a
  page sheet.

See the `theme` prop of `Header.dc.html` (`arena`, `dark`, `classic`; the dark prop draws the same ink
chrome) and `Rail.dc.html` (`arena` or `classic`), and the `Estados.dc.html` board, which shows the header
in the three themes plus the visitor header, the account menu, the notifications panel and the Ctrl K search.

## Boards

Route names are the addresses the shell keeps (`web/app.js` `PROFILE_TABS`): `/news`, `/profile`,
`/glads`, `/potion`, `/battle` (plus `/battle.<mode>`), `/reports`, `/ranking`, `/messages`, `/friends`.
The view is the Painel shell (`web/view/profile.html` today); the page entry is
`web/public/script/profile.js` until WP3 introduces the shell modules. Component names are the ones in
[`docs/frontend/components.md`](../../frontend/components.md); “section-local” means markup owned by
that section's templates, not a reusable component.

| Board | What it shows | Route(s) | View | Page entry | Components | API |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Main.dc.html` (Notícias) | Page header with “Marcar tudo como lido”, the featured news article with image and tag, the previous-posts list with date block, and the aside: “Aguardando você” (duel, reports, potions, friend request) and the next tournament countdown with a bracket link. | `/news` | `web/view/profile.html` | `script/profile.js` + `script/profile/news.js` | AppHeader, PainelMenu, PageHeader, SectionCard, Button, EmptyState, Badge; article and todo rows are section-local | existing `GET /news?offset=`, `GET /news/:hash`, `GET /notifications`, `GET /duels`, `GET /friends`, `GET /reports?unreadOnly=true`, `GET /potions/slots`, `GET /tournaments?mineOffset=&openOffset=`, `GET /tournament-rounds/:hash/:round/status`; `GET /news` gains `markRead=false` in WP3 (the shell feed) and defaults to it in WP4, when `POST /news/read` is new (WP4) |
| `Perfil.dc.html` (Perfil) | The identity hero (avatar with “Trocar foto”, nickname, master level, XP bar, battles/wins/renown tiles) over the Aparência, Identidade, e-mail switches and the autosave footer with the “Desfazer” toast. | `/profile` (and `?t=profile`) | `web/view/profile.html` | `script/profile.js` + `script/profile/settings.js` | AppHeader, PainelMenu, PageHeader (the hero), Avatar, Input, SegmentedControl, ChoiceCards, Switch, SaveStatus, SectionCard, Toast with undo, Button | existing `GET /users/me`, `PUT /users/me`; the hero's battles/wins totals are new (WP4, `GET /users/me` gains `stats`) |
| `Gladiadores.dc.html` (Gladiadores) | The game-card grid: brass frame, lit stage, language crest, status seal (PRONTO / DESATUALIZADO / COM ERRO), renown plaque, segmented STR/AGI/INT bars, stamped states, beveled BATALHAR and the card menu; a dashed free slot; the Todos / Prontos / Precisam de atenção filter and “Novo gladiador”. | `/glads` | `web/view/profile.html` | `script/profile.js` + `script/profile/glads.js` | AppHeader, PainelMenu, PageHeader, SegmentedControl, GladiatorCard, Button, EmptyState, Toast | existing `GET /gladiators`, `GET /gladiators/:id`, `DELETE /gladiators/:id`; records and battle counts per gladiator are new (WP5) |
| `Pocoes.dc.html` (Poções) | The apothecary panel (level, order duration, upgrade cost with silver) over four potion compartments (filled with countdown, empty, locked) and the shop grid with kind filters and per-potion kind, level, `useItem` id and price. | `/potion` | `web/view/profile.html` | `script/profile.js` + `script/profile/potions.js` | AppHeader, PainelMenu, PageHeader, SectionCard, PotionSlot, PotionCard, SegmentedControl, Button, Toast, EmptyState | existing `GET /potions`, `GET /potions/apothecary`, `GET /potions/slots`, `POST /potions/slots`, `DELETE /potions/slots/:id`, `POST /potions/apothecary/upgrade`; `GET /potions/slots` gains `expiresAt` per slot and `serverNow` (WP3, for the shell badge); `POST /potions/slots` returns the new `slots` and `serverNow` alongside `{ slotId, silver }` (WP6) |
| `Batalhas.dc.html` (Batalhas) | The pending duel invite banner, the four mode cards (Ranqueada / Duelo / Torneio / Treino) with counts, and the ranked panel: character select with filtered-out gladiators, the VersusPanel (chosen gladiator against “Sorteado”, potions carried, reward) and “PROCURAR ADVERSÁRIOS”. | `/battle`, `/battle.ranked`, `/battle.duel`, `/battle.tourn`, `/battle.train` | `web/view/profile.html` | `script/profile.js` + `script/profile/battle.js`, `ranked.js`, `duels.js`, `tournaments.js`, `trainings.js` | AppHeader, PainelMenu, PageHeader, InviteBanner, ChoiceCards, Tabs, GladiatorPicker, VersusPanel, SectionCard, Button, Toast, EmptyState | existing `GET /duels`, `POST /duels`, `DELETE /duels/:id`, `POST /duels/:id/battle`, `POST /battles/ranked/match`, `POST /battles/ranked`, `GET /tournaments`, `GET /trainings`, `GET /gladiators`, `GET /potions/slots` |
| `Relatorios.dc.html` (Relatórios) | The form streak (last ten results) and the 7-day renown total, the Ranqueadas / Duelos / Favoritas tabs with counts, the unread switch, the report table (placing pill, gladiator, opponents, renown delta, when, Assistir, favourite) and the pager. | `/reports` | `web/view/profile.html` | `script/profile.js` + `script/profile/reports.js` | AppHeader, PainelMenu, PageHeader, FormStreak, Tabs, Switch, ResultPill, Pagination, Button, EmptyState | existing `GET /reports?offset=&favorites=&unreadOnly=&markRead=`, `PUT /reports/:id/favorite`, `GET /duels/history?offset=`; placing, opponents and the streak summary are new (WP6, `GET /reports` gains them) |
| `Ranking.dc.html` (Ranking) | Search by gladiator or master, the “Seus gladiadores” strip with each position and the jump arrow, the Geral / Amigos / Turma 3B tabs and podium chips, and the numbered table with the own row highlighted, numbered pagination and “Ir para a posição”. | `/ranking`, `/ranking?at=<position>` | `web/view/profile.html` | `script/profile.js` + `script/profile/ranking.js` | AppHeader, PainelMenu, PageHeader, SearchField, OwnGladiatorJump, Tabs, RankingTable, Pagination, EmptyState | existing `GET /ranking?offset=&search=`, `GET /ranking/me`, `GET /ranking/tabs`, `GET /ranking/tabs/:tag?search=`, `PUT /ranking/tabs/:tag`; `GET /ranking/window?gladiatorId=<id>&size=9` (or `?position=<n>&size=9`) and `GET /ranking/mine` are new (WP7), and a friends list is new (`GET /ranking?scope=friends`, WP7) |
| `Mensagens.dc.html` (Mensagens) | The two-pane inbox: conversation list with avatars, last message, unread counts and relative time; the thread with day marker, bubbles, a shared replay card and the composer; “Nova mensagem” and the conversation search. | `/messages`, `/messages/<userId>` | `web/view/profile.html` | `script/profile.js` + `script/profile/messages.js` | AppHeader, PainelMenu, PageHeader, SearchField, Avatar, ConversationList, MessageThread, Composer, Button, EmptyState, Toast | existing `GET /messages?page=`, `POST /messages`, `POST /messages/:id/reply`, `PUT /messages/:id`, `DELETE /messages/:id`; conversation grouping and read state are new (WP8: `GET /conversations`, `GET /conversations/:userId`, `POST /conversations/:userId/read`; `<userId>` is the other master's id) |
| `Amigos.dc.html` (Amigos) | The received-invite banner, “Seus amigos” with online dots and each friend's best gladiator and renown, the Message / Desafiar / more actions, and the dark “Encontrar mestres” search panel with Add / invitation sent. | `/friends` | `web/view/profile.html` | `script/profile.js` + `script/profile/friends.js` | AppHeader, PainelMenu, PageHeader, InviteBanner, FriendRow, Avatar, SearchField, Button, EmptyState, Toast | existing `GET /friends`, `GET /friends/confirmed?filter=`, `GET /friends/search?nick=`, `POST /friends`, `PUT /friends/requests/:id`, `DELETE /friends/:id`; online state and best gladiator are new fields on `GET /friends` (WP8) |
| `Header.dc.html` (Cabeçalho) | The signed-in header (logo, Painel/Editor/Aprender/Sobre nav with the active underline, the Ctrl K search field, the Batalhar CTA, the silver chip, the bell with its count and the avatar with the level ring) and the visitor variant (“Entrar com Google”). | every page that includes `{{> header}}` | partial `web/view/header.html` | `script/header.js` (WP3: `script/components/app-header.js`) | AppHeader, SearchField, Avatar, Badge, AccountMenu, NotificationsPanel, Button | existing `GET /users/me`, `GET /notifications`, `PUT /users/me` (theme); the panel feed composes `GET /duels`, `GET /friends`, `GET /reports?unreadOnly=true` and `GET /news?markRead=false`; global search is `GET /search?q=` (WP3) |
| `Rail.dc.html` (Menu do painel) | The 264 px Painel menu: identity card (avatar, nickname, master level, XP bar, Perfil), Notícias with unread, PREPARAÇÃO (Gladiadores 4/6, Poções 3 h), ARENA (Batalhas 1, Relatórios 3, Ranking #128), COMUNIDADE (Mensagens 2, Amigos 1), “Novo gladiador”, the G + initial hint and the engine version. | every section (`/news` … `/friends`) | `web/view/profile.html` | `script/profile.js` + `script/profile/notifications.js` (WP3: `script/components/painel-menu.js`) | PainelMenu, MenuItem, Badge, Avatar, Button | existing `GET /notifications`, `GET /users/me`, `GET /gladiators`, `GET /potions/slots`, `GET /ranking/me` |
| `Estados.dc.html` (Cabeçalho e menu: temas e estados) | Arena light/dark side by side, Classic, the visitor header, the account menu (identity, Perfil e ajustes, Atalhos do teclado, theme choice, Sair), the notifications panel (Precisa de você / Novidades) and the Ctrl K palette with grouped results. | every page with the header; the panels open from it | `web/view/header.html` + `web/view/profile.html` | `script/header.js`, `script/profile.js` | AppHeader, AccountMenu, NotificationsPanel, CommandPalette, Avatar, Badge, Switch, SearchField | existing `GET /users/me`, `PUT /users/me` (`theme`), `GET /notifications`; the panel feed composes `GET /duels`, `GET /friends`, `GET /reports?unreadOnly=true` and `GET /news?markRead=false`; global search is new (WP3) |
| `Mobile.dc.html` (Celular) | The phone shell: compact header (logo, search, bell dot, avatar), the bottom bar with Notícias / Gladiadores / the raised Batalhar / Relatórios / Mais, the “Mais” sheet (identity card, six tiles with counts, Editor/Aprender/Sobre), the Gladiadores list rows and the Batalhas mode list. | every section at phone width | `web/view/profile.html` + `web/view/header.html` | `script/profile.js`, `script/header.js` (WP3: `script/components/mobile-tab-bar.js`, `more-sheet.js`) | MobileTabBar, MoreSheet, AppHeader, PainelMenu (identity card), Badge, InviteBanner, GladiatorCard (compact), SectionCard | same as the sections above; the counts come from `GET /notifications` and `GET /potions/slots` |

## From boards to work packages

| Work package | Boards |
| :--- | :--- |
| WP2 Platform | all boards: the shared primitives, tokens and the component gallery |
| WP3 App shell | Header, Rail, Estados, Mobile |
| WP4 Notícias + Perfil | Main, Perfil |
| WP5 Gladiadores + Batalhas | Gladiadores, Batalhas |
| WP6 Poções + Relatórios | Pocoes, Relatorios |
| WP7 Ranking | Ranking |
| WP8 Mensagens + Amigos | Mensagens, Amigos |
| WP9 Phone, themes, accessibility, audit | all boards at 390/820/1440 px in Arena light, Arena dark and Classic |

The boards are the target, not a claim about today's code: the current sections are described in
[`docs/frontend/pages.md`](../../frontend/pages.md) and each catalogue entry states whether it exists or
which WP builds it.
