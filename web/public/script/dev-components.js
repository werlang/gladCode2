import { Avatar } from './components/avatar.js';
import { Badge } from './components/badge.js';
import { PageHeader } from './components/page-header.js';
import { Pagination } from './components/pagination.js';
import { SearchField } from './components/search-field.js';
import { SectionCard } from './components/section-card.js';
import { SegmentedControl } from './components/segmented-control.js';
import { Switch } from './components/switch.js';
import { Tabs, tabPanelIds } from './components/tabs.js';
import { createToast } from './components/toast.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { applyTheme, THEME_CHOICES } from './helpers/theme.js';
import { emptyStateTemplate } from './templates/empty-state.js';

/** @param {string} selector @returns {HTMLElement} */
const slot = selector => document.querySelector(selector);

/**
 * Builds every WP2 primitive in its states. This page is a development gallery: no app data, no
 * network.
 */
function pageHeader() {
    const header = new PageHeader();
    header.set({
        title: 'Notícias',
        subtitle: 'O que mudou na arena e o que está esperando por você.',
    });
    header.setActions([
        createElement("<button type='button' class='button primary'>Marcar tudo como lido</button>"),
    ]);
    slot('#example-page-header').append(header.element);
}

function sectionCards() {
    const container = slot('#example-section-cards');
    const normal = new SectionCard();
    normal.setTitle('Identidade');
    normal.setActions([createElement("<button type='button' class='button ghost small'>Ação</button>")]);
    normal.setBody([createElement('<p>Uma seção normal, com título, ação e conteúdo.</p>')]);

    const busy = new SectionCard();
    busy.setTitle('Carregando');
    busy.setBody([createElement('<p>O conteúdo está sendo buscado.</p>')]);
    busy.setBusy(true);

    const empty = new SectionCard();
    empty.setTitle('Vazio');
    empty.setEmpty({
        icon: 'inbox',
        title: 'Nada por aqui',
        summary: 'Quando houver algo, ele aparece nesta lista.',
        actionHtml: "<button type='button' class='button secondary small'>Criar</button>",
    });

    const error = new SectionCard();
    error.setTitle('Erro');
    error.setError({ message: 'Não foi possível carregar. Tente novamente.' });
    error.listen('retry', () => createToast('Nova tentativa solicitada', 'info'));

    container.append(normal.element, busy.element, empty.element, error.element);
}

function badges() {
    const container = slot('#example-badges');
    const action = new Badge({ kind: 'action', count: 2 });
    action.setDescription('2 desafios de duelo');
    const unread = new Badge({ kind: 'unread', count: 7 });
    const info = new Badge({ kind: 'info', label: '4/6' });
    const time = new Badge({ kind: 'info', label: '3 h' });
    const rank = new Badge({ kind: 'info', label: '#128' });
    container.append(action.element, unread.element, info.element, time.element, rank.element);
}

function avatars() {
    const container = slot('#example-avatars');
    const picture = new Avatar({
        size: 'lg',
        name: 'Spartacus_C',
        picture: '/image/glad-placeholder.svg',
        level: 23,
        online: true,
    });
    picture.setRing(0.62);
    const initialsAvatar = new Avatar({ size: 'md', name: 'Ana Lux', level: 8 });
    initialsAvatar.setRing(0.3);
    const small = new Avatar({ size: 'sm', name: 'bytewolf', online: true });
    container.append(picture.element, initialsAvatar.element, small.element);
}

/**
 * A tab set with real panels: the tab points at the panel with aria-controls, the panel is named by
 * the tab, and selecting a tab hides the others.
 *
 * @param {Tabs} tabs
 * @param {Array<{ id: string, label: string, count?: number }>} items
 * @returns {HTMLElement}
 */
function tabsWithPanels(tabs, items) {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-stack';
    const panels = new Map();

    for (const item of items) {
        const ids = tabPanelIds(item.id);
        const panel = document.createElement('div');
        panel.id = ids.panel;
        panel.className = 'gallery-panel surface-card';
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', ids.tab);
        panel.textContent = `Conteúdo da aba ${item.label}.`;
        panel.hidden = !item.selected;
        panels.set(item.id, panel);
    }

    tabs.setItems(items.map(item => ({ ...item, panelId: tabPanelIds(item.id).panel })));
    tabs.listen('select', ({ id }) => {
        for (const [panelId, panel] of panels) panel.hidden = panelId !== id;
    });
    wrap.append(tabs.element, ...panels.values());
    return wrap;
}

function tabs() {
    const container = slot('#example-tabs');
    const underline = new Tabs({ variant: 'underline', label: 'Relatórios' });
    underline.listen('select', detail => createToast(`Aba: ${detail.id}`, 'info'));
    const underlineWrap = tabsWithPanels(underline, [
        { id: 'ranked', label: 'Ranqueadas', count: 3, selected: true },
        { id: 'duels', label: 'Duelos' },
        { id: 'favorites', label: 'Favoritas' },
    ]);

    const pill = new Tabs({ variant: 'pill', label: 'Ranking' });
    pill.listen('select', detail => createToast(`Lista: ${detail.id}`, 'info'));
    const pillWrap = tabsWithPanels(pill, [
        { id: 'general', label: 'Geral', selected: true },
        { id: 'friends', label: 'Amigos' },
        { id: 'class', label: 'Turma 3B' },
    ]);

    const wrap = document.createElement('div');
    wrap.className = 'gallery-stack';
    wrap.append(underlineWrap, pillWrap);
    container.append(wrap);
}

function segmented() {
    const container = slot('#example-segmented');
    const language = new SegmentedControl({ label: 'Linguagem padrão' });
    language.setOptions([{ value: 'c', label: 'C' }, { value: 'python', label: 'Python' }, { value: 'blocks', label: 'Blocos' }]);
    language.set('c', { silent: true });
    language.listen('change', detail => createToast(`Linguagem: ${detail.value}`, 'info'));

    const filter = new SegmentedControl({ label: 'Filtro de gladiadores' });
    filter.setOptions([
        { value: 'all', label: 'Todos', count: 4 },
        { value: 'ready', label: 'Prontos', count: 2 },
        { value: 'attention', label: 'Precisam de atenção', count: 2 },
    ]);
    filter.set('all', { silent: true });

    container.append(language.element, filter.element);
}

function switches() {
    const container = slot('#example-switches');
    const on = new Switch({ checked: true, label: 'Mensagens recebidas' });
    const off = new Switch({ checked: false, label: 'Convites de amizade' });
    const disabled = new Switch({ checked: true, label: 'Desativado' });
    disabled.setDisabled(true);
    container.append(on.element, off.element, disabled.element);
}

function search() {
    const container = slot('#example-search');
    const normal = new SearchField({ label: 'Buscar no ranking', placeholder: 'Gladiador ou mestre' });
    normal.listen('search', detail => createToast(`Busca: ${detail.value || '(vazia)'}`, 'info'));
    const dark = new SearchField({ label: 'Buscar mestres', placeholder: 'Apelido do mestre', variant: 'dark' });
    const busy = new SearchField({ label: 'Buscando', placeholder: 'Carregando…' });
    busy.setBusy(true);
    container.append(normal.element, dark.element, busy.element);
}

function pagination() {
    const container = slot('#example-pagination');
    const numbered = new Pagination({ variant: 'numbered' });
    numbered.set({ page: 9, pages: 164, total: 1638, pageSize: 10 });
    numbered.listen('change', detail => createToast(`Página ${detail.page}`, 'info'));
    numbered.listen('jump', detail => createToast(`Ir para ${detail.position}`, 'info'));

    const simple = new Pagination({ variant: 'simple' });
    simple.set({ page: 1, pages: 49, total: 482, pageSize: 10 });

    container.append(numbered.element, simple.element);
}

function toasts() {
    const container = slot('#example-toasts');
    const messages = [
        ['info', 'Notícia marcada como lida'],
        ['success', 'Informações atualizadas'],
        ['error', 'Não foi possível salvar'],
    ];
    for (const [type, message] of messages) {
        const button = createElement(`<button type='button' class='button ${type === 'error' ? 'danger' : 'secondary'}'>Toast ${type}</button>`);
        button.addEventListener('click', () => createToast(message, type));
        container.append(button);
    }
    const undo = createElement("<button type='button' class='button secondary'>Toast com Desfazer</button>");
    undo.addEventListener('click', () => createToast('Tema alterado para Clássico', {
        type: 'success',
        action: { label: 'Desfazer', onClick: () => createToast('Alteração desfeita', 'info') },
    }));
    container.append(undo);
}

function emptyStates() {
    const container = slot('#example-empty');
    const full = createElement(renderTemplate(emptyStateTemplate, {
        variantClass: '',
        icon: 'shield-halved',
        title: 'Nenhum gladiador ainda',
        summary: 'Recrute um gladiador e treine-o no editor.',
        actionHtml: "<button type='button' class='button primary small'>Novo gladiador</button>",
    }));
    const compact = createElement(renderTemplate(emptyStateTemplate, {
        variantClass: 'compact',
        icon: 'inbox',
        title: 'Nada por aqui',
        summary: 'Assim que houver, aparece nesta lista.',
        actionHtml: '',
    }));
    container.append(full, compact);
}

function primitives() {
    const buttons = slot('#example-buttons');
    for (const variant of ['primary', 'secondary', 'neutral', 'ghost', 'outline', 'danger', 'success']) {
        buttons.append(createElement(`<button type='button' class='button ${variant}'>${variant}</button>`));
    }
    buttons.append(createElement("<button type='button' class='button primary small'>small</button>"));
    buttons.append(createElement("<button type='button' class='button primary large'>large</button>"));

    const fields = slot('#example-fields');
    fields.append(createElement("<input class='input' placeholder='Apelido' aria-label='Apelido'>"));
    fields.append(createElement("<input class='input boxed' value='Spartacus_C' aria-label='Apelido preenchido'>"));
    fields.append(createElement("<select class='input' aria-label='Linguagem'><option>Texto</option><option>Outro</option></select>"));
    fields.append(createElement("<div class='surface-card gallery-surface'>Um surface-card</div>"));
}

function themes() {
    const requested = new URLSearchParams(location.search).get('theme');
    const initial = THEME_CHOICES.includes(requested) ? requested : 'system';
    applyTheme(initial);
    const buttons = [...document.querySelectorAll('.gallery-theme')];
    const mark = () => {
        const active = document.documentElement.classList.contains('theme-classic') ? 'classic'
            : document.documentElement.classList.contains('theme-arena-dark') ? 'arena-dark' : 'arena-light';
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.value === active)));
    };
    buttons.forEach(button => button.addEventListener('click', () => {
        applyTheme(button.value);
        mark();
    }));
    mark();
}

themes();
pageHeader();
sectionCards();
badges();
avatars();
tabs();
segmented();
switches();
search();
pagination();
toasts();
emptyStates();
primitives();
