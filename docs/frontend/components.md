# Component catalogue

Every reusable page element of the Painel. One entry per component: what it is for, how it is built, what
it emits, its stylesheet and the design boards that show it. The boards are in
[`docs/design/painel/`](../design/painel/README.md).

Read [conventions.md](conventions.md) first. The shared rules for every entry:

- A component extends `BaseComponent` (`web/public/script/components/base-component.js`): `on(target,
  event, listener)` tracks listeners, `clearListeners()` and `destroy()` release them.
- A **new** component's constructor takes one options object `{ element, ... }`. `element` is the
  server-rendered root when the view rendered it; when the component creates its own root, it omits it and
  exposes `element`. The existing primitives keep their documented signatures (for example
  `new Countdown(element, options)`), listed below.
- A mutating method returns `this`; a method that loads something returns a promise.
- A component **never calls a model**. Data arrives in the constructor or through a setter; it **emits a
  component event** when the user does something, and the parent decides. Two existing components break
  this rule and are cleaned when their section is rebuilt: `loadGladCards` falls back to
  `GladiatorModel.list()` when no list is passed (WP5 removes the fallback), and `SideMenu` fetches
  `side-menu.html` (outside the Painel; it stays as it is).
- Component events are `CustomEvent`s dispatched on the component's root with `bubbles: true`; the
  `detail` payload is listed per entry. App events (a different thing) are in [events.md](events.md).
- ARIA and classes follow [conventions.md §6](conventions.md#6-accessibility); data never goes in
  `data-*`.
- A component gets its own stylesheet in `web/public/css/components/`, named after the file.

## Status at a glance

| Component | Status | File (today → target) | WP |
| :--- | :--- | :--- | :--- |
| AppHeader | exists, rebuilt | `components/header.js` → `components/app-header.js` | WP3 |
| AccountMenu | new | `components/account-menu.js` | WP3 |
| NotificationsPanel | new | `components/notifications-panel.js` | WP3 |
| CommandPalette | new | `components/command-palette.js` | WP3 |
| PainelMenu | new (replaces `#menu` markup in `view/profile.html`) | `components/painel-menu.js` | WP3 |
| MenuItem | new | `components/menu-item.js` | WP3 |
| Badge | new | `components/badge.js` | WP3 |
| MobileTabBar | new | `components/mobile-tab-bar.js` | WP3 |
| MoreSheet | new | `components/more-sheet.js` | WP3 |
| PageHeader | new | `components/page-header.js` | WP4 |
| SectionCard | new (over `.surface-card`) | `components/section-card.js` | WP4 |
| Tabs | new | `components/tabs.js` | WP4 |
| SegmentedControl | new | `components/segmented-control.js` | WP4 |
| ChoiceCards | new | `components/choice-cards.js` | WP4 |
| Switch | new | `components/switch.js` | WP4 |
| Pagination | new | `components/pagination.js` | WP4 |
| SearchField | new | `components/search-field.js` | WP4 |
| Avatar | new | `components/avatar.js` | WP4 |
| SaveStatus | new | `components/save-status.js` | WP4 |
| Toast (with undo) | exists, extended | `components/toast.js` | WP2 |
| EmptyState | exists | `templates/empty-state.js` | — |
| GladiatorCard | exists, rebuilt as the game card | `components/glad-card.js` → `components/gladiator-card.js` | WP5 |
| GladiatorPicker | new | `components/gladiator-picker.js` | WP5 |
| VersusPanel | new | `components/versus-panel.js` | WP5 |
| ResultPill | new | `components/result-pill.js` | WP6 |
| FormStreak | new | `components/form-streak.js` | WP6 |
| PotionSlot | new | `components/potion-slot.js` | WP6 |
| PotionCard | new | `components/potion-card.js` | WP6 |
| ConversationList | new | `components/conversation-list.js` | WP8 |
| MessageThread | new | `components/message-thread.js` | WP8 |
| Composer | new | `components/composer.js` | WP8 |
| FriendRow | new | `components/friend-row.js` | WP8 |
| InviteBanner | new | `components/invite-banner.js` | WP8 |
| RankingTable | new | `components/ranking-table.js` | WP7 |
| OwnGladiatorJump | new | `components/own-gladiator-jump.js` | WP7 |

## Existing primitives

These exist today, are loaded by `web/view/head.html` on every page and are the base every new component
composes. Their contracts are settled; the Painel only adds variants where the boards need one.

### Button — exists

- **File:** `components/button.js`; **CSS:** `css/components/button.css`.
- **Purpose:** a `.button` that runs an async action; disables itself with a spinner until the action
  settles (`click(action)`), so it cannot be sent twice.
- **Constructor:** `new Button({ element, text, icon, title, variant })` (`variant`: `primary`,
  `secondary`, `neutral`, `ghost`, `outline`, `danger`, `success`, `small`, `large`, `block`).
- **Methods:** `click(action)`, `disable(spin)`, `enable()`, `setText(text, icon)`, `get busy`.
- **Events:** none; the action's promise is the contract.
- **Boards:** every board with an action.

### Field, Input, Select — exist

- **Files:** `components/field.js` (base), `input.js`, `select.js`; **CSS:** `css/components/field.css`.
- **Purpose:** form controls with one error contract: `.error`, `aria-invalid`, focus, and an error that
  clears on edit.
- **Constructor:** `new Input(element)`, `new Select(element)`, both on `Field`.
- **Methods:** `Input`: `get/set value`, `input(cb)`, `keyDown(cb)`; `Select`: `get value`, `set(value)`,
  `setOptions(list)`, `change(cb)`; both: `setError(message)`, `clearError()`, `get error`.
- **Events:** none (callbacks).
- **Boards:** Perfil (nickname), Ranking (jump), Mensagens (composer), Amigos (search).

### Dialog family — exists

- **File:** `components/dialog.js`; **CSS:** `css/dialog.css` (`#fog`, `#dialog-box`, `#terminal`).
- **Exports:** `Message` class, `showDialog(message, buttons)`, `showMessage(message)`,
  `showInput(message, defaultValue)`, `showTextArea(message, placeholder, maxChars)`,
  `showTerminal(title, message)`.
- **Purpose:** the only modal in the site: fog, panel, title, message, buttons, focus handling (focus is
  moved into the box today; the focus trap, Esc close and focus return are added in WP2).
- **Boards:** confirmations everywhere; not drawn as a board.

### Toast — exists, extended in WP2

- **File:** `components/toast.js`; **CSS:** `css/dialog.css` (`.toast`).
- **Purpose:** a short corner notification, stacked from the bottom.
- **Today:** `createToast(message, type = 'info')` with `error|info|success`; fades after 2 s + 3 s.
- **Target (WP2):** `createToast(message, { type, duration, action })` where `action` is
  `{ label: 'Desfazer', onClick }`; returns a `Toast` with `dismiss()`. The string second argument keeps
  working until its callers are rebuilt. The undo toast stays until the action is taken or the duration
  (the boards suggest 6 s) ends, and is announced with `role="status"`.
- **Events:** none; `action.onClick` is the callback.
- **Boards:** Perfil (autosave undo), Main (mark all read).

### Tooltip — exists

- **File:** `components/tooltip.js`; **CSS:** `css/dialog.css` (`.ui-tooltip`).
- **Purpose:** promotes `title` attributes on the page to styled tooltips; no markup needed.
- **Boards:** all icon buttons.

### Slider — exists

- **File:** `components/slider.js`; **CSS:** `css/ui-slider.css` (base) and `css/slider.css` (look).
- **Boards:** not in the Painel boards; used by the editor and trainings.

### EmptyState — exists

- **File:** `templates/empty-state.js`; **CSS:** `css/components/empty-state.css`.
- **Purpose:** the shared “nothing here”: medallion, title, summary and an optional action row.
- **API:** `renderTemplate(emptyStateTemplate, { variantClass, icon, title, summary, actionHtml })`;
  `variantClass` is `''` or `'compact'`.
- **Boards:** Relatórios, Ranking, Mensagens, Amigos, Gladiadores (only when no filter matches).

### SideMenu — exists

- **File:** `components/side-menu.js`; **CSS:** `css/side-menu.css`.
- **Purpose:** the documentation tree (manual, docs). Not part of the Painel; the Painel menu is
  `PainelMenu`.

### Countdown — exists

- **File:** `components/countdown.js`.
- **Purpose:** a deadline counter (`new Countdown(element, { deadline, now, onTick, onEnd })`), used by
  tournaments, trainings and the potions countdown; the main page's next-tournament countdown reuses it.

### ProgressButton and Simulation — exist

- **File:** `components/simulation.js`; **CSS:** `css/profile.css` / `css/editor.css` for placement.
- **Purpose:** running a battle with a progress bar (`ProgressButton`) and the battle-tips screen
  (`Simulation`, `runSimulation`). They are the reason a start-battle button is not a plain `Button`.

## Shell components

### AppHeader — exists, rebuilt (WP3)

- **File:** `components/app-header.js` (today `components/header.js` `Header`); **CSS:**
  `css/components/app-header.css` (today `css/header.css`); **view:** `web/view/header.html`.
- **Purpose:** the fixed frame of every page: logo, primary nav (Painel, Editor, Aprender, Sobre), the
  search field/trigger, the Batalhar CTA, the silver chip, the notification bell and the account avatar;
  the visitor variant offers “Entrar com Google”.
- **Constructor:** `new AppHeader({ element, account, counts, active })`; `account` is the signed-in
  user or `null`, `counts` the badge view model (`{ notifications, silver, level }`) and `active` the
  section id.
- **Methods:** `setAccount(user|null)`, `setCounts(counts)`, `setActive(section)`, `setSearching(on)`,
  `openNotifications()`, `closePanels()`.
- **Events:** `sign-in` `{}`, `search` `{ query }` (as the field is typed), `battle` `{}` (the CTA),
  `account` `{}` (avatar), `notifications` `{}` (bell).
- **ARIA:** `<header>` with `<nav aria-label="Principal">`, the active entry `aria-current="page"`; the
  bell's label carries the unread count; the avatar's label names the master and level.
- **Boards:** `Header.dc.html`, `Estados.dc.html`, `Mobile.dc.html`, every section board.

### AccountMenu — new (WP3)

- **File:** `components/account-menu.js`; **CSS:** `css/components/account-menu.css`.
- **Purpose:** the avatar popover: identity (name, level, silver), “Perfil e ajustes”, “Atalhos do
  teclado”, the three theme choices (`Claro`, `Escuro`, `Clássico`; `Sistema` is offered in the Perfil
  section) and “Sair”.
- **Constructor:** `new AccountMenu({ element })`; the element is the panel the view rendered (hidden).
- **Methods:** `open(trigger)`, `close()`, `setAccount(user)`, `setTheme(choice)`.
- **Events:** `theme-select` `{ choice }`, `shortcuts` `{}`, `sign-out` `{}`, `close` `{}`.
- **ARIA:** a non-modal menu: trigger `aria-expanded`/`aria-controls`, roving focus (arrow keys), Esc
  closes and returns focus; theme buttons use `aria-pressed`.
- **Boards:** `Estados.dc.html`.

### NotificationsPanel — new (WP3)

- **File:** `components/notifications-panel.js`; **CSS:** `css/components/notifications-panel.css`.
- **Purpose:** the bell panel: “Precisa de você” (pending duel, friend request) and “Novidades”
  (reports, news), each row with the destination, plus “Marcar como lidas”.
- **Constructor:** `new NotificationsPanel({ element })`.
- **Methods:** `open(trigger)`, `close()`, `setItems({ needs, news })`, `setCount(count)`.
- **Events:** `read-all` `{}`, `open-item` `{ id, href }`, `close` `{}`.
- **ARIA:** labelled dialog/popover, focus moved to the first item, Esc closes.
- **Boards:** `Estados.dc.html`, `Header.dc.html` (the bell).

### CommandPalette — new (WP3)

- **File:** `components/command-palette.js`; **CSS:** `css/components/command-palette.css`.
- **Purpose:** Ctrl K / ⌘K navigation and search: a search field in a panel, results grouped as “Ir para”,
  “Gladiadores e mestres” and “Documentação”, keyboard-first.
- **Constructor:** `new CommandPalette({ element, commands, search })`; `commands` is the static
  navigation list (`{ id, label, href, group, keywords }`) and `search(query, signal)` is the async data
  lookup from the shell service.
- **Methods:** `open({ query })`, `close()`, `setResults(groups)`, `setBusy(on)`.
- **Events:** `navigate` `{ href, target }`, `search` `{ query }` (the palette may also call `search`
  directly; the shell owns the request), `close` `{}`.
- **ARIA:** `role="dialog"` `aria-modal="true"`, labelled by its input, `listbox`/`option` results with
  `aria-activedescendant`, Tab kept inside, Esc closes, focus returns to the opener.
- **Boards:** `Estados.dc.html` (the search panel), `Mobile.dc.html` (search button).

### PainelMenu — new (WP3)

- **File:** `components/painel-menu.js` (replaces the `#menu` markup of `view/profile.html`); **CSS:**
  `css/components/painel-menu.css`.
- **Purpose:** the 264 px side menu: the identity card (avatar, nickname, master level, XP bar, link to
  Perfil), Notícias, the PREPARAÇÃO / ARENA / COMUNIDADE groups, “Novo gladiador”, the G + initial hint
  and the engine version.
- **Constructor:** `new PainelMenu({ element, sections, account, counts })`; `sections` is the ordered
  group definition (id, label, icon, href, group, badge kind).
- **Methods:** `setActive(section)`, `setAccount(user)`, `setCounts(counts)`, `open()`/`close()` for the
  phone drawer.
- **Events:** `navigate` `{ section, href }` (so the shell can close the phone drawer and scroll to the
  top), `new-gladiator` `{}`.
- **Children:** `MenuItem` + `Badge`; the identity card is `Avatar` + the XP bar.
- **ARIA:** `<nav aria-label="Painel">`, the active item `aria-current="page"`; the groups are titled with
  `aria-labelledby` or a visually hidden heading; badges are text, not colour.
- **Boards:** `Rail.dc.html` and every section board; the identity card also appears in the `Mobile.dc.html`
  “Mais” sheet.

### MenuItem — new (WP3)

- **File:** `components/menu-item.js`; **CSS:** `css/components/menu-item.css`.
- **Purpose:** one menu entry: a 30 px icon tile, the label and an optional badge (“4/6”, “3 h”, “1”).
- **Constructor:** `new MenuItem({ element, icon, label, href, badgeKind })`.
- **Methods:** `setActive(on)`, `setBadge(text)`, `setDisabled(on)`.
- **Events:** none (an `<a href>` navigates; the `PainelMenu` listens for `click` to emit `navigate`).
- **Variants:** `icon` (tile only, for the 600–899 px rail), `compact` (phone rows), `identity` (the card
  at the top, composed by `PainelMenu`).
- **Boards:** `Rail.dc.html`, `Mobile.dc.html`.

### Badge — new (WP3)

- **File:** `components/badge.js`; **CSS:** `css/components/badge.css`.
- **Purpose:** one counter/pill with three meanings, as the boards use them: **action** (gold, “needs
  you”: a duel, a friend request), **unread** (light, a count of unread items: reports, messages) and
  **info** (muted, a state: “4/6”, “#128”, “3 h”, “1 nova”).
- **Constructor:** `new Badge({ element, count, kind })`.
- **Methods:** `set(count)`, `setKind(kind)`, `setLabel(text)` (for “1 nova”).
- **Events:** none.
- **ARIA:** the text is always in the DOM; a count above 99 reads `99+`; an action badge carries a
  `title`/label saying what it is (“1 desafio de duelo”).
- **Boards:** `Rail.dc.html`, `Header.dc.html`, `Mobile.dc.html`, `Mensagens.dc.html`, `Amigos.dc.html`.

### MobileTabBar — new (WP3)

- **File:** `components/mobile-tab-bar.js`; **CSS:** `css/components/mobile-tab-bar.css`.
- **Purpose:** the phone bottom bar: Notícias, Gladiadores, the raised Batalhar action, Relatórios and
  Mais; dots/badges on the entries that need attention.
- **Constructor:** `new MobileTabBar({ element })`.
- **Methods:** `setActive(section)`, `setCounts({ battle, reports, news, more })`.
- **Events:** `navigate` `{ section }`, `more` `{}`.
- **ARIA:** `<nav aria-label="Seções">`, each entry a link with `aria-current="page"`; the raised
  Batalhar button keeps a 44 px target despite the visual circle; badges have text.
- **Boards:** `Mobile.dc.html`.

### MoreSheet — new (WP3)

- **File:** `components/more-sheet.js`; **CSS:** `css/components/more-sheet.css`.
- **Purpose:** the phone “Mais” sheet: the identity card, the six section tiles with counts (Poções,
  Ranking, Mensagens, Amigos, Notícias, Ajustes) and the Editor/Aprender/Sobre links.
- **Constructor:** `new MoreSheet({ element })`.
- **Methods:** `open()`, `close()`, `setAccount(user)`, `setCounts(counts)`.
- **Events:** `navigate` `{ section, href }`, `close` `{}`.
- **ARIA:** a modal bottom sheet: `role="dialog"` `aria-modal="true"`, labelled heading, scrim closes,
  Esc closes, focus trapped and returned.
- **Boards:** `Mobile.dc.html`.

## Page components

### PageHeader — new (WP4)

- **File:** `components/page-header.js`; **CSS:** `css/components/page-header.css`.
- **Purpose:** the section heading: `<h1>`, a one-line subtitle, and a right-hand slot for actions or a
  summary (the filter on Gladiadores, the form streak on Relatórios, the search on Ranking, “Nova
  mensagem” on Mensagens).
- **Constructor:** `new PageHeader({ element })`.
- **Methods:** `set({ title, subtitle })`, `setActions(children)`; exposes `element` and `actions`.
- **Events:** none.
- **ARIA:** one `<h1>` per section; actions are real buttons/links.
- **Boards:** every section board.

### SectionCard — new (WP4)

- **File:** `components/section-card.js`; **CSS:** `css/components/section-card.css` (extends
  `.surface-card`).
- **Purpose:** the panel that groups a section's content: optional title row with actions, a body slot,
  and built-in loading, empty and error states.
- **Constructor:** `new SectionCard({ element })`.
- **Methods:** `setTitle(text)`, `setActions(children)`, `setBusy(on)`, `setEmpty({ icon, title, summary,
  action })`, `setError({ message, retry })`, `setBody(children)`; `get body`.
- **Events:** `retry` `{}` when the error action is pressed.
- **ARIA:** `aria-busy` while loading; the error is `role="alert"`.
- **Boards:** Main (articles), Perfil, Poções (apothecary), Relatórios, Ranking, Mensagens, Amigos,
  Batalhas (ranked panel).

### Tabs — new (WP4)

- **File:** `components/tabs.js`; **CSS:** `css/components/tabs.css`.
- **Purpose:** the underline tabs of Relatórios and the pill tabs of Ranking/Batalhas, switching real
  panels.
- **Constructor:** `new Tabs({ element, variant })` (`underline` or `pill`).
- **Methods:** `setItems([{ id, label, count }])`, `select(id, { silent })`, `get selected`.
- **Events:** `select` `{ id }`.
- **ARIA:** `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, panels `role="tabpanel"`;
  Left/Right/Home/End move; the count is text inside the tab.
- **Boards:** `Relatorios.dc.html` (underline + counts), `Ranking.dc.html` (pills), `Batalhas.dc.html`
  (the mode cards are their own element; the ranked panel uses the same selection state).

### SegmentedControl — new (WP4)

- **File:** `components/segmented-control.js`; **CSS:** `css/components/segmented-control.css`.
- **Purpose:** a small set of mutually exclusive choices shown as one bar: the language (C / Python /
  Blocos), the gladiator filter (Todos / Prontos / Precisam de atenção), the potion kind (Todas / Vida /
  Habilidade / Atributos / Experiência).
- **Constructor:** `new SegmentedControl({ element })`.
- **Methods:** `setOptions([{ value, label, count }])`, `set(value)`, `get value`.
- **Events:** `change` `{ value }`.
- **ARIA:** `role="group"` with `aria-label`; each option a `<button aria-pressed>`; the selected style
  does not rely on colour alone.
- **Boards:** `Perfil.dc.html`, `Gladiadores.dc.html`, `Pocoes.dc.html`.

### ChoiceCards — new (WP4)

- **File:** `components/choice-cards.js`; **CSS:** `css/components/choice-cards.css`.
- **Purpose:** a single choice shown as large cards: the three site themes (Arena claro, Arena escuro,
  Clássico) with their preview, the two gladiator styles (Coliseu 3D, Pixel art), and the four battle modes
  (Ranqueada, Duelo, Torneio, Treino) with their description and count pill.
- **Constructor:** `new ChoiceCards({ element, variant })` (`variant`: `preview`, `icon` or `mode`).
- **Methods:** `setOptions([{ value, title, description, icon, preview, badge, disabled }])`, `set(value)`,
  `get value`.
- **Events:** `change` `{ value }`.
- **ARIA:** `role="radiogroup"` with a label; each card a `<button role="radio" aria-checked>` (the
  preview is decorative, the title is the label); arrow keys move, Home/End jump; the selected card keeps
  a 2 px accent ring and an `aria-checked` state, not only a colour.
- **Boards:** `Perfil.dc.html` (theme and gladiator style), `Batalhas.dc.html` (mode cards).

### Switch — new (WP4)

- **File:** `components/switch.js`; **CSS:** `css/components/switch.css`.
- **Purpose:** an on/off setting: the e-mail preferences and the “Só não vistas” filter.
- **Constructor:** `new Switch({ element })`.
- **Methods:** `set(checked)`, `get checked`, `setDisabled(on)`.
- **Events:** `change` `{ checked }`.
- **ARIA:** `role="switch"` + `aria-checked`; a real `<button>` or a styled checkbox; the label is
  associated (`aria-labelledby` or a wrapping `<label>`).
- **Boards:** `Perfil.dc.html`, `Relatorios.dc.html`.

### Pagination — new (WP4)

- **File:** `components/pagination.js`; **CSS:** `css/components/pagination.css`.
- **Purpose:** the page controls: the simple previous/next of Relatórios and the numbered pages of
  Ranking, plus “Ir para a posição”.
- **Constructor:** `new Pagination({ element, variant })` (`simple` or `numbered`).
- **Methods:** `set({ page, pages, total, pageSize })`, `goTo(page)`; `set` computes the “1–7 de 482”
  label and the page window (`1 … 8 9 10 … 164`).
- **Events:** `change` `{ page }`, `jump` `{ position }` (the go-to field, in gladiator position, not
  page).
- **ARIA:** `<nav aria-label="Páginas">`, current page `aria-current="page"`, disabled arrows
  `disabled`, the jump form a real `<form>` with a labelled input.
- **Boards:** `Relatorios.dc.html`, `Ranking.dc.html`.

### SearchField — new (WP4)

- **File:** `components/search-field.js`; **CSS:** `css/components/search-field.css`.
- **Purpose:** the one search input: the header field, the Ranking search, the conversation search and
  the master search (dark variant).
- **Constructor:** `new SearchField({ element, debounce = 300 })`.
- **Methods:** `get value`, `set(value)`, `focus()`, `clear()`, `setBusy(on)`.
- **Events:** `search` `{ value }` (debounced, only when it changed), `submit` `{ value }` (Enter).
- **ARIA:** labelled (`aria-label` or `<label>`), a clear button with `aria-label="Limpar busca"`, and
  `role="search"` on the form.
- **Boards:** `Header.dc.html`, `Estados.dc.html`, `Ranking.dc.html`, `Mensagens.dc.html`,
  `Amigos.dc.html`.

### Avatar — new (WP4)

- **File:** `components/avatar.js`; **CSS:** `css/components/avatar.css`.
- **Purpose:** a master's picture with the fallback initials, the level ring and the online dot; used by
  the header, the Painel identity card, the account menu, messages, friends and the ranking strip.
- **Constructor:** `new Avatar({ element, size })` (`size`: `sm` 34, `md` 44, `lg` 104).
- **Methods:** `set({ picture, name, level })`, `setRing(ratio)` (0–1 for the level ring), `setOnline(on)`.
- **Events:** none.
- **ARIA:** the `<img>` has an `alt` naming the master (empty when the name is beside it); initials are
  `aria-hidden`; the online dot carries a text label for screen readers.
- **Boards:** `Header.dc.html`, `Rail.dc.html`, `Perfil.dc.html`, `Mensagens.dc.html`, `Amigos.dc.html`,
  `Ranking.dc.html`, `Mobile.dc.html`.

### SaveStatus — new (WP4)

- **File:** `components/save-status.js`; **CSS:** `css/components/save-status.css`.
- **Purpose:** the inline “Salvo”, “Salvando…”, “Disponível · salva quando você sai do campo” state of
  the autosaving Perfil fields.
- **Constructor:** `new SaveStatus({ element })`.
- **Methods:** `set(state, message)` with `idle|saving|saved|error`.
- **Events:** `retry` `{}` when the error state's action is pressed.
- **ARIA:** `role="status"` `aria-live="polite"`; never an alert unless the save failed.
- **Boards:** `Perfil.dc.html`.

## Game components

### GladiatorCard — exists, rebuilt (WP5)

- **Files:** `components/glad-card.js` today (`GladCardPainter`, `loadGladCards`,
  `loadSelectableCards`, `gladOfCard`) → `components/gladiator-card.js`; **templates:**
  `templates/glad-card.js` → `templates/gladiator-card.js`; **CSS:** `css/glad-card.css` →
  `css/components/gladiator-card.css`.
- **Purpose:** the game card of a gladiator: brass/rot/blood frame, lit stage with the portrait (3D
  portrait or pixel-art sprite, per `glad-view`), the language crest, the status seal (PRONTO /
  DESATUALIZADO / COM ERRO), the renown plaque with the MMR, the segmented STR/AGI/INT bars, the stamped
  state (FORA DA ARENA / COM ERRO), the alert line and the beveled BATALHAR plus the “more actions”
  menu.
- **Constructor:** `new GladiatorCard({ element, gladiator, view })`; the element is the card the
  template rendered; `view` is `sprite|3d`.
- **Methods:** `setGladiator(gladiator)`, `setSelected(on)`, `setDisabled(on)`, `setView(view)`,
  `setBusy(on)`; `get gladiator`.
- **Events:** `battle` `{ gladiator }`, `edit` `{ gladiator }`, `code` `{ gladiator }`, `more`
  `{ gladiator, anchor }`, `select` `{ gladiator }`.
- **Variants:** `full` (the Gladiadores grid), `compact` (the phone list), `picker` (the character
  select), `locked` (a gladiator that cannot fight: outdated or broken).
- **Portraits:** keep `GladCardPainter` (lazy 3D portrait, sprite cache, repaint in place on
  `gladviewchange`); the new card reuses it. A card never loads three unless `view` is `3d`.
- **Boards:** `Gladiadores.dc.html`, `Batalhas.dc.html`, `Mobile.dc.html`.

### GladiatorPicker — new (WP5)

- **File:** `components/gladiator-picker.js`; **CSS:** `css/components/gladiator-picker.css`.
- **Purpose:** the character select of Batalhas: a grid of picker cards, one chosen at a time, the
  chosen card lifted with an “ESCOLHIDO” tag, unavailable cards dimmed with a lock and the reason
  (“Desatualizado” / “Com erro”), and a double click confirming.
- **Constructor:** `new GladiatorPicker({ element, gladiators })`.
- **Methods:** `setGladiators(list)`, `select(id)`, `get selected`, `setDisabled(reason)`.
- **Events:** `select` `{ gladiator }`, `confirm` `{ gladiator }`.
- **ARIA:** a listbox-like single choice: cards are buttons with `aria-pressed`, arrow-key movement and
  a label naming the gladiator and its state; a disabled card is `aria-disabled` but still focusable so
  its reason can be read.
- **Boards:** `Batalhas.dc.html`, `Mobile.dc.html`.

### VersusPanel — new (WP5)

- **File:** `components/versus-panel.js`; **CSS:** `css/components/versus-panel.css`.
- **Purpose:** the ranked panel's right column: the chosen gladiator's round portrait, the “VS” mark, the
  “Sorteado” opponent placeholder (or the matched opponent's portrait and renown), the potions carried,
  the reward line and the “PROCURAR ADVERSÁRIOS” button.
- **Constructor:** `new VersusPanel({ element })`.
- **Methods:** `setGladiator(gladiator| null)`, `setOpponent(opponent|null)`, `setPotions(slots)`,
  `setReward(text)`, `setBusy(on)`, `setReady(on)`.
- **Events:** `fight` `{}`.
- **ARIA:** the button is the only action; the potion list is a definition list; the opponent placeholder
  says “Sorteado” in text.
- **Boards:** `Batalhas.dc.html`.

### ResultPill — new (WP6)

- **File:** `components/result-pill.js`; **CSS:** `css/components/result-pill.css`.
- **Purpose:** the placing of a report, “1º de 5”, coloured by medal for 1st/2nd/3rd and neutral
  otherwise.
- **Constructor:** `new ResultPill({ element, place, total })`.
- **Methods:** `set(place, total)`.
- **Events:** none.
- **ARIA:** the full text, never only colour.
- **Boards:** `Relatorios.dc.html`.

### FormStreak — new (WP6)

- **File:** `components/form-streak.js`; **CSS:** `css/components/form-streak.css`.
- **Purpose:** the last ten results as a row of V/D tiles with a “Últimas 10 batalhas” label, beside the
  7-day renown total.
- **Constructor:** `new FormStreak({ element, results })` where a result is `{ won, title }`.
- **Methods:** `set(results)`.
- **Events:** none.
- **ARIA:** each tile has a `title`/`aria-label` (“Venceu” / “Perdeu”); the row has a summary label.
- **Boards:** `Relatorios.dc.html`.

### PotionSlot — new (WP6)

- **File:** `components/potion-slot.js`; **CSS:** `css/components/potion-slot.css`.
- **Purpose:** one of the four potion compartments: a filled potion with its kind tint, a countdown bar
  and time; an empty dashed slot that points to the shop; a locked slot with its master level.
- **Constructor:** `new PotionSlot({ element, index })`.
- **Methods:** `setPotion(slot|null)`, `setLocked(level)`, `setEmpty()`; the countdown uses
  `components/countdown.js` and stops when the slot leaves the DOM.
- **Events:** `empty` `{ index }` (focus the shop), `cancel` `{ slot }` (the slot's menu).
- **ARIA:** the countdown is text (`role="timer"` with an accessible label), not only a bar.
- **Boards:** `Pocoes.dc.html`, `Batalhas.dc.html` (the pots carried in the versus panel).

### PotionCard — new (WP6)

- **File:** `components/potion-card.js`; **CSS:** `css/components/potion-card.css`.
- **Purpose:** one potion on sale: kind icon/tint, name, level and `useItem` id, description, price and
  the order button (or “Apotecário nível 4” when locked).
- **Constructor:** `new PotionCard({ element, potion, unlocked })`.
- **Methods:** `setPotion(potion)`, `setUnlocked(on)`, `setBusy(on)`.
- **Events:** `order` `{ potion }`.
- **Boards:** `Pocoes.dc.html`.

### ConversationList — new (WP8)

- **File:** `components/conversation-list.js`; **CSS:** `css/components/conversation-list.css`.
- **Purpose:** the left pane of Mensagens: the conversation search and one row per master (avatar, name,
  last message, relative time, unread count), the open row highlighted.
- **Constructor:** `new ConversationList({ element, conversations })`.
- **Methods:** `setConversations(list)`, `select(id)`, `setFilter(text)`, `setBusy(on)`.
- **Events:** `select` `{ id }`, `search` `{ query }`.
- **ARIA:** a list of links (`aria-current="page"` on the open one); unread is text in the row.
- **Boards:** `Mensagens.dc.html`.

### MessageThread — new (WP8)

- **File:** `components/message-thread.js`; **CSS:** `css/components/message-thread.css`.
- **Purpose:** the conversation pane: header (avatar, name, online state, Desafiar, more), the day
  marker, incoming/outgoing bubbles, a shared replay card and the timestamp.
- **Constructor:** `new MessageThread({ element })`.
- **Methods:** `setConversation({ user, messages })`, `append(message)`, `setOnline(on)`, `scrollToEnd()`,
  `setBusy(on)`.
- **Events:** `challenge` `{ user }`, `open-replay` `{ hash }`, `more` `{ user }`.
- **ARIA:** a live region for newly appended messages; each bubble is a list item with the sender named
  for screen readers.
- **Boards:** `Mensagens.dc.html`.

### Composer — new (WP8)

- **File:** `components/composer.js`; **CSS:** `css/components/composer.css`.
- **Purpose:** the message box: a labelled textarea that grows, the send button, Enter to send and
  Shift+Enter for a new line.
- **Constructor:** `new Composer({ element, placeholder })`.
- **Methods:** `setValue(text)`, `get value`, `setBusy(on)`, `focus()`, `clear()`.
- **Events:** `send` `{ text }`.
- **ARIA:** a labelled textarea; the send button is disabled while empty; a failed send keeps the text.
- **Boards:** `Mensagens.dc.html`.

### FriendRow — new (WP8)

- **File:** `components/friend-row.js`; **CSS:** `css/components/friend-row.css`.
- **Purpose:** one row of the friends list: avatar with the online dot, name, level and best gladiator
  with renown, and the Message / Desafiar / more actions.
- **Constructor:** `new FriendRow({ element, friend })`.
- **Methods:** `setFriend(friend)`, `setOnline(on)`.
- **Events:** `message` `{ friend }`, `challenge` `{ friend }`, `more` `{ friend, anchor }`.
- **ARIA:** icon-only actions carry `aria-label` with the friend's name.
- **Boards:** `Amigos.dc.html`.

### InviteBanner — new (WP8)

- **File:** `components/invite-banner.js`; **CSS:** `css/components/invite-banner.css`.
- **Purpose:** the highlighted pending invite, used for a friend request (Amigos) and a duel challenge
  (Batalhas): avatar, the message, the secondary detail and Recusar / Aceitar.
- **Constructor:** `new InviteBanner({ element })`.
- **Methods:** `set({ picture, name, message, detail, acceptLabel, refuseLabel })`, `setBusy(on)`.
- **Events:** `accept` `{}`, `refuse` `{}`.
- **ARIA:** `<section aria-label>` naming the invite; both actions are buttons.
- **Boards:** `Amigos.dc.html`, `Batalhas.dc.html`.

### RankingTable — new (WP7)

- **File:** `components/ranking-table.js`; **CSS:** `css/components/ranking-table.css`.
- **Purpose:** the ranking table: position, gladiator (with the VOCÊ tag), master, 7-day trend, renown,
  the own row highlighted, a podium summary and the header strip “Em volta de X · posições 124–132”.
- **Constructor:** `new RankingTable({ element })`.
- **Methods:** `setRows(rows)`, `setContext({ around, position, page })`, `setBusy(on)`.
- **Events:** `open-gladiator` `{ gladiator }` (a row links to the gladiator/master).
- **ARIA:** a real `<table>` with `<th scope="col">`; the own row is marked in text (“VOCÊ”); trends read
  “subiu 9” / “desceu 3” / “estável”.
- **Boards:** `Ranking.dc.html`.

### OwnGladiatorJump — new (WP7)

- **File:** `components/own-gladiator-jump.js`; **CSS:** `css/components/own-gladiator-jump.css`.
- **Purpose:** the “SEUS GLADIADORES” strip: one chip per own gladiator with its position and an arrow to
  jump the table; a gladiator out of the ranking is dimmed and says why (desatualizado / com erro).
- **Constructor:** `new OwnGladiatorJump({ element, gladiators })`.
- **Methods:** `setGladiators(list)`, `setActive(id)`.
- **Events:** `jump` `{ gladiator, position }`.
- **ARIA:** each chip is a link/button with a `title` naming the destination; `aria-current="page"` on
  the active one.
- **Boards:** `Ranking.dc.html`.

## Composition map

| Board | Components |
| :--- | :--- |
| Main | AppHeader, PainelMenu, PageHeader, SectionCard, Button, EmptyState, Badge |
| Perfil | AppHeader, PainelMenu, PageHeader, Avatar, Input, SegmentedControl, ChoiceCards, Switch, SaveStatus, SectionCard, Toast, Button |
| Gladiadores | AppHeader, PainelMenu, PageHeader, SegmentedControl, GladiatorCard, Button, EmptyState |
| Poções | AppHeader, PainelMenu, PageHeader, SectionCard, PotionSlot, PotionCard, SegmentedControl, Button, Toast |
| Batalhas | AppHeader, PainelMenu, PageHeader, InviteBanner, ChoiceCards, GladiatorPicker, VersusPanel, SectionCard, Button |
| Relatórios | AppHeader, PainelMenu, PageHeader, FormStreak, Tabs, Switch, ResultPill, Pagination, EmptyState |
| Ranking | AppHeader, PainelMenu, PageHeader, SearchField, OwnGladiatorJump, Tabs, RankingTable, Pagination |
| Mensagens | AppHeader, PainelMenu, PageHeader, SearchField, Avatar, ConversationList, MessageThread, Composer |
| Amigos | AppHeader, PainelMenu, PageHeader, InviteBanner, FriendRow, Avatar, SearchField, Button |
| Header / Estados | AppHeader, AccountMenu, NotificationsPanel, CommandPalette, SearchField, Avatar, Badge, Switch |
| Mobile | AppHeader, MobileTabBar, MoreSheet, PainelMenu (identity card), GladiatorCard (compact), InviteBanner |
