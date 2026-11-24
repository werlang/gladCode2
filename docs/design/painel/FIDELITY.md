# Painel board fidelity audit (WP9)

Target: the static boards in this folder, drawn in Arena light. Implementation screenshots are
1440×900 for desktop and 390×844/360×740 for phones, in the same three themes as the product
(Arena light, Arena dark, Classic). Proof lives in `.orchestration/shots/WP9/`: `board-*.png` are the
boards (rendered by `dev-tools/render-boards.mjs`; the canvas runtime and image blobs are not exported,
so the artboard images show layout boxes), and `impl/*.png` are the live application.

Status vocabulary:

- **match** — the live element follows the board's copy, order, hierarchy and states.
- **intentional** — a deliberate difference with a reason (real data, no API field, accessibility, or
  the decisions log).
- **fixed in WP9** — a difference found by this audit and corrected here.

## Theme proof

The implementation was captured in all three themes at the board size. This table links the extra
evidence; the section tables below pair the board itself with the Arena-light implementation.

| Board | Arena light | Arena dark | Classic |
| --- | --- | --- | --- |
| Header / Rail | [news light](../../../.orchestration/shots/WP9/impl/news-arena-light-1440.png) | [news dark](../../../.orchestration/shots/WP9/impl/news-arena-dark-1440.png) | [news classic](../../../.orchestration/shots/WP9/impl/news-classic-1440.png) |
| Estados panels | [account](../../../.orchestration/shots/WP9/impl/estado-account-arena-light-1440.png) | [notifications](../../../.orchestration/shots/WP9/impl/estado-notifications-arena-light-1440.png) (panels use the same theme roles) | [palette](../../../.orchestration/shots/WP9/impl/estado-palette-arena-light-1440.png) |
| Main | [light](../../../.orchestration/shots/WP9/impl/news-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/news-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/news-classic-1440.png) |
| Perfil | [light](../../../.orchestration/shots/WP9/impl/profile-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/profile-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/profile-classic-1440.png) |
| Gladiadores | [light](../../../.orchestration/shots/WP9/impl/glads-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/glads-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/glads-classic-1440.png) |
| Poções | [light](../../../.orchestration/shots/WP9/impl/potions-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/potions-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/potions-classic-1440.png) |
| Batalhas | [light](../../../.orchestration/shots/WP9/impl/battle-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/battle-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/battle-classic-1440.png) |
| Relatórios | [light](../../../.orchestration/shots/WP9/impl/reports-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/reports-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/reports-classic-1440.png) |
| Ranking | [light](../../../.orchestration/shots/WP9/impl/ranking-own-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/ranking-own-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/ranking-own-classic-1440.png) |
| Mensagens | [light](../../../.orchestration/shots/WP9/impl/messages-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/messages-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/messages-classic-1440.png) |
| Amigos | [light](../../../.orchestration/shots/WP9/impl/friends-search-arena-light-1440.png) | [dark](../../../.orchestration/shots/WP9/impl/friends-search-arena-dark-1440.png) | [classic](../../../.orchestration/shots/WP9/impl/friends-search-classic-1440.png) |
| Mobile | [390 light](../../../.orchestration/shots/WP9/impl/glads-arena-light-390.png) | [390 dark](../../../.orchestration/shots/WP9/impl/glads-arena-dark-390.png) | [390 classic](../../../.orchestration/shots/WP9/impl/glads-classic-390.png) |

The accepted differences that apply to every board are: **real data instead of the sample data**
(names, counts, levels, prices, renown, dates, challenge/report numbers); **3D portraits fall back to
the placeholder** because the Synty pack and WebGL2 are not available on this host; and the
**ranking includes every engine version** (decisions log). Board samples use fixed art; a real state
can therefore show fewer/more rows or different labels without a layout change.

## Header

| Board (Arena light) | Implemented (Arena light) |
| --- | --- |
| ![Header board](../../../.orchestration/shots/WP9/board-Header.png) | ![Header implementation](../../../.orchestration/shots/WP9/impl/news-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Wordmark/logo and home link | match |
| Painel · Editor · Aprender · Sobre navigation, chevron and active underline | match |
| Search field with placeholder and Ctrl K keycap | match |
| Batalhar CTA, silver chip and bell count | match (live silver/count) |
| Avatar with level badge and account menu entry | match |
| Signed-in / visitor states | intentional: the visitor header omits Painel and shows “Entrar com Google” (`estado-visitor-arena-light-1440.png`); a visitor has no Painel route |
| Three themes | match: Arena light and Arena dark share ink chrome; Classic uses brand blue (`impl/news-<theme>-1440.png`) |

## Rail

| Board | Implemented |
| --- | --- |
| ![Rail board](../../../.orchestration/shots/WP9/board-Rail.png) | ![Rail implementation](../../../.orchestration/shots/WP9/impl/news-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Identity card: avatar, nickname, master level, XP bar and Perfil link | match |
| Groups Notícias / PREPARAÇÃO / ARENA / COMUNIDADE and order | match |
| Gladiadores, Poções, Batalhas, Relatórios, Ranking, Mensagens and Amigos entries | match |
| Live badges (news, slots, duels, reports, ranking, messages, invites) | match (real counts) |
| Dashed “Novo gladiador” action | match |
| Footer shortcut hint and engine version | match (live version) |
| Active entry ring and `aria-current` | match |
| Collapsed rail at 600–899 px | intentional: the implementation keeps icons and hides labels (pages.md) |

## Estados — header, account menu, notifications and palette

| Board | Implemented |
| --- | --- |
| ![States board](../../../.orchestration/shots/WP9/board-Estados.png) | ![Account menu](../../../.orchestration/shots/WP9/impl/estado-account-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Arena light / Arena dark header pair and Classic header | match |
| Visitor header | intentional (see Header) |
| Account menu: identity, silver, Perfil e ajustes, Atalhos do teclado, Tema Claro/Escuro/Clássico, Sair | match (`estado-account-arena-light-1440.png`) |
| Notifications panel: title, “Marcar como lidas”, Precisa de você / Novidades, rows with section/time | match (`estado-notifications-arena-light-1440.png`) |
| Category-coloured row dots | fixed in WP9: duel gold, invite red, report violet, news brand |
| Palette: search input, Esc, Ir para, Gladiadores e mestres, Documentação groups, keyboard selection | match when a query is typed (`estado-palette-arena-light-1440.png`); a 560 px panel instead of the board's 400 px is intentional, to fit the three groups (WP3) |
| Focus in the palette search | fixed in WP9: `:focus-within` ring on the search row |
| Panel focus trap/return (account, bell, sheet, palette, dialog) | match; browser probe: first row focused, Esc restores the opener |

## Main — Notícias

| Board | Implemented |
| --- | --- |
| ![Main board](../../../.orchestration/shots/WP9/board-Main.png) | ![Notícias implementation](../../../.orchestration/shots/WP9/impl/news-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Page header “Notícias”, subtitle and “Marcar tudo como lido” | match |
| Featured article: image, NOVA ribbon, tag, version/date, title, body and “Ler notícia” | match (live post) |
| “Anteriores” list: date block, title, excerpt, tag | match |
| “Aguardando você” aside and count (duel, reports, potions, friend request) | fixed in WP9: request rows are emitted after reports/potions, matching the board's order |
| Next tournament: name/round, countdown and bracket link | match (real tournament; hidden when none) |
| News pager “Ver mais notícias” | intentional: the board has no pager; the live list grows in pages (WP4) |
| Article image for a post without a stored image | match: the arena still is the fallback |

## Perfil

| Board | Implemented |
| --- | --- |
| ![Perfil board](../../../.orchestration/shots/WP9/board-Perfil.png) | ![Perfil implementation](../../../.orchestration/shots/WP9/impl/profile-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Identity hero: avatar, photo button, nickname, master level, join date, XP bar, battles/wins/renown tiles | match (live stats) |
| Identidade: nickname, example, autosave status, default-language segmented control | match |
| Aparência: theme cards, “Seguir o tema do sistema”, theme help | match; the board shows the explicit Arena light choice, the proof account uses system |
| “Como os gladiadores aparecem” (Coliseu 3D / Pixel art) | match |
| E-mail preferences and autosave footer | match; the implementation has five rows (tournament/training notices too), intentional |
| Save status chips | match: idle/salvo/erro states; the board's “Salvo” is a saved state, not a permanent label |
| Undo toast | match |

## Gladiadores

| Board | Implemented |
| --- | --- |
| ![Gladiadores board](../../../.orchestration/shots/WP9/board-Gladiadores.png) | ![Gladiadores implementation](../../../.orchestration/shots/WP9/impl/glads-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header/subtitle (“N de M vagas ocupadas…”) and filter Todos/Prontos/Precisam de atenção | match |
| “Novo gladiador” action | match |
| Card frame/stage/language crest/status seal/renown plaque/name/record/STR-AGI-INT bars/actions | match |
| Dashed free slot | match when a slot is free; the proof account is at its limit |
| PRONTO / DESATUALIZADO / COM ERRO states, disabled BATALHAR and “FORA DA ARENA” stamp | match |
| Phone compact choose-list with portrait, name, state note and chevron | fixed in WP9 (`impl/glads-arena-light-390.png`); it was the full card grid |
| 3D portraits | intentional host limitation (placeholder/sprite fallback) |

## Poções

| Board | Implemented |
| --- | --- |
| ![Poções board](../../../.orchestration/shots/WP9/board-Pocoes.png) | ![Poções implementation](../../../.orchestration/shots/WP9/impl/potions-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header and subtitle | match |
| Apothecary panel: level, order duration, next-level chip and upgrade price/action | match (live level and price) |
| Four compartments: filled countdown, empty, locked with level | match (the board's filled/locked counts follow the real level) |
| Shop title and kind filters (Todas/Vida/Habilidade/Atributos/Experiência) | match |
| Potion cards: icon, name, `useItem` id, description, price/coin, order button | match; the real catalogue has 21 items |
| Unavailable cards | fixed in WP9: no opacity wash, readable code/price and the “Apotecário nível N” state |
| Phone layout | match, 44 px order/filter targets |

## Batalhas

| Board | Implemented |
| --- | --- |
| ![Batalhas board](../../../.orchestration/shots/WP9/board-Batalhas.png) | ![Batalhas implementation](../../../.orchestration/shots/WP9/impl/battle-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Pending invite: name, gladiator, Recusar / Escolher gladiador e aceitar | intentional: the API does not expire duel challenges, so the board sample's “Responda em até 2 dias.” is not rendered; the invite says “Luta com <gladiator>.” only |
| Four mode cards with title, description and live pill | match |
| Selected mode ink fill, gold icon tile and alert pill | match |
| Distinct icons per mode | intentional: the board repeats the swords glyph; the implementation uses duel/trophy/training icons |
| Ranked picker: eligible cards, locked/outdated/broken frames, chosen card | match; the proof account has no stored pick, so no card is selected |
| VersusPanel: chosen gladiator, “Sorteado” with `?`, VS, potions/reward, search action | fixed in WP9: the empty opponent now shows the board's question-mark placeholder |
| Phone compact mode list | fixed in WP9 (`impl/battle-arena-light-390.png`) |
| Duel/tournament/training panels behind the cards | match the retained flows |

## Relatórios

| Board | Implemented |
| --- | --- |
| ![Relatórios board](../../../.orchestration/shots/WP9/board-Relatorios.png) | ![Relatórios implementation](../../../.orchestration/shots/WP9/impl/reports-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header and subtitle | match |
| Form streak (10 results) and 7-day renown | match (real results) |
| Ranqueadas / Duelos / Favoritas tabs with counts | match |
| “Só não vistas” switch | match |
| Table columns RESULTADO / GLADIADOR / ADVERSÁRIOS / RENOME / QUANDO | match |
| Result pills, unread dots, renown colours, favourite star and Assistir | match; the board mixes read/unread rows, the proof page has unread rows |
| Pager and range | match |
| Phone horizontal table scroll with reachable star/Assistir | match; the proof scrolls the table inside its card |

## Ranking

| Board | Implemented |
| --- | --- |
| ![Ranking board](../../../.orchestration/shots/WP9/board-Ranking.png) | ![Ranking own window](../../../.orchestration/shots/WP9/impl/ranking-own-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header, subtitle and “Gladiador ou mestre” search | match; the subtitle says “N gladiadores por renome.” because every engine version is kept (decisions log) |
| “Seus gladiadores” strip with portrait, name, position/state and jump arrow | match |
| Geral / Amigos / custom list tabs and podium chips | match; custom list labels use the stored hashtag (WP7) |
| Context bar (“Em volta de …, posições …, página …”) and “Voltar ao topo” | match in the `?at=` window (`ranking-own-*`); the general page shows “Ranking geral” |
| Table POS/GLADIADOR/MESTRE/7 DIAS/RENOME, own row in ink, VOCÊ pill | match |
| Numbered pagination, previous/next and “Ir para a posição” | match |
| Phone table and own jump | match; 44 px controls |
| Board sample rows/pages | intentional: live 246 gladiators and 25 pages, not the 2 448/164 sample |
| Own-row contrast in Classic | fixed in WP9 (position, VOCÊ and trend chips) |

## Mensagens

| Board | Implemented |
| --- | --- |
| ![Mensagens board](../../../.orchestration/shots/WP9/board-Mensagens.png) | ![Mensagens implementation](../../../.orchestration/shots/WP9/impl/messages-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header “Mensagens”, subtitle and “Nova mensagem” | match |
| Conversation search and rows: avatar/initials, name, snippet, time, unread count, bold unread, current row | match |
| Thread header: avatar, name, online state, Desafiar, more menu | match; the phone back control now uses a left arrow |
| Day marker, incoming/outgoing bubbles, quote and times | match |
| Shared replay card with arena thumbnail, “Replay compartilhado” and Assistir | fixed in WP9: the card gained the board's image treatment; replay metadata (gladiator/placement/time) is not in the message payload, so the card labels the share instead of inventing it |
| Composer: placeholder, textarea, Enviar, Enter/Shift+Enter, refusal keeps draft | match |
| Phone list → thread split and back | match; cold `/messages/<id>` opens the thread full-height and the composer stays above the bar (fixed in WP9) |
| Conversation/new-message behaviour after clearing search | fixed in the WP8 fix round and rechecked in WP9 |
| Sample conversations and unread counts | intentional: live data |

## Amigos

| Board | Implemented |
| --- | --- |
| ![Amigos board](../../../.orchestration/shots/WP9/board-Amigos.png) | ![Amigos search](../../../.orchestration/shots/WP9/impl/friends-search-arena-light-1440.png) |

| Element | Status |
| --- | --- |
| Header and subtitle | match |
| Pending invite banner: avatar, “X quer ser seu amigo”, level/mutual friends, Recusar/Aceitar | match |
| “Seus amigos · N”, “N online agora”, online dot | match |
| Friend row: avatar, name, level, best gladiator and renown, message/Desafiar/more | match |
| Unfriend confirmation | match |
| “Encontrar mestres” dark aside, search field and rows | match |
| Result states Adicionar / Convite enviado / Amigos | match; “Convite recebido” is also shown for an incoming request |
| Search results height | fixed in WP9: the list scrolls inside the aside instead of growing the page |
| Invite detail contrast | fixed in WP9 |
| Sample friends/search results | intentional: live data |

## Mobile

| Board | Implemented |
| --- | --- |
| ![Mobile board](../../../.orchestration/shots/WP9/board-Mobile.png) | ![Phone gladiators](../../../.orchestration/shots/WP9/impl/glads-arena-light-390.png) |

| Element | Status |
| --- | --- |
| Compact header (logo, search, bell, avatar) | match; the bell keeps the live count instead of a dot-only badge |
| Bottom bar: Notícias / Gladiadores / raised Batalhar / Relatórios / Mais | match |
| Counts/badges and active state | match |
| “Mais” sheet: handle, identity card, six tiles, Editor/Aprender/Sobre | match (`estado-more-sheet-arena-light-390.png`) |
| Gladiadores phone list with portrait, name, state, chevron | fixed in WP9 |
| Batalhas phone mode list | fixed in WP9 |
| Pending invite on phone | intentional: the full Recusar/Aceitar actions stay visible for a 44 px target (the board's compact “Responder” omits the choice) |
| Safe-area and 44 px targets | match; the fixed bar includes `env(safe-area-inset-bottom)` and focused fields clear it |
| Keyboard over the composer/inputs | fixed in WP9: a focused phone field is scrolled above the fixed bar when the visual viewport shrinks (simulated 400 px run) |
| 390×844 and 360×740 | match: no horizontal page scroll in any section (automated audit) |

## WP9 fixes and remaining limits

Fixed in this package: phone back arrow; stale conversation failures; double-escaped invite toasts;
picker placeholder/restore; content width matching the board's 1080 px column; 44 px phone targets;
focus ring in the palette/header search; category dots in the notification panel; versus question-mark
placeholder; the invite keeps no invented deadline (WP5-r2 F7); replay card thumbnail; compact mobile glads and battle lists;
friend result height; several theme contrast failures; and the dead profile menu, tab, message,
friend, notification and template code removed with the obsolete PNGs.

Remaining limits: No Synty pack/WebGL2 here, so portraits use the sprite/placeholder path; the palette
is 560 px wide rather than the board's 400 px to fit three result groups; real data replaces sample
data; and the custom ranking and permission states depend on the live account/database.
