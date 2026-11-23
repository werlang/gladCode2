import './blocks.js';
import { createToast, isModalOpen } from './components/toast.js';
import { GoogleLogin } from './helpers/google-login.js';
import { APP_EVENTS, events } from './helpers/event-bus.js';
import { resolveRoute, SECTION_SHORTCUTS, sectionTitle, sectionUrl } from './helpers/painel-route.js';
import { isAborted, retryableError } from './helpers/section-request.js';
import { RankModel } from './models/rank.js';
import { BattleTab } from './profile/battle.js';
import { FriendsTab } from './profile/friends.js';
import { GladsTab } from './profile/glads.js';
import { MessagesTab } from './profile/messages.js';
import { NewsTab } from './profile/news.js';
import { PotionsTab } from './profile/potions.js';
import { RankingTab } from './profile/ranking.js';
import { ReportsTab } from './profile/reports.js';
import { profile } from './profile/session.js';
import { SettingsTab } from './profile/settings.js';
import { account } from './services/account.js';
import { notifications } from './services/notifications.js';
import { MobileTabBar } from './components/mobile-tab-bar.js';
import { MoreSheet } from './components/more-sheet.js';
import { PainelMenu } from './components/painel-menu.js';

/** Ends a legacy /logout visit: refusal keeps the page and offers a retry toast. */
async function logoutRoute() {
    try {
        await account.signOut();
    }
    catch {
        createToast('Não foi possível sair. Tente novamente.', {
            type: 'error',
            action: { label: 'Tentar novamente', onClick: logoutRoute },
        });
        return;
    }
    GoogleLogin.removeCredential();
    location.assign('/');
}

/**
 * The Painel shell: route resolver, one content column and the rail/tab bar. The section bodies
 * remain the existing controllers until WP4–WP8 rebuild them.
 */
async function start() {
    const requested = new URLSearchParams(location.search).get('t');
    if (location.pathname === '/logout' || requested === 'logout') {
        await logoutRoute();
        return;
    }

    profile.user = await account.load();
    if (!profile.user?.id) {
        const route = resolveRoute(location);
        location.replace(route ? `/?login=${encodeURIComponent(route.section)}` : '/');
        return;
    }

    const battle = new BattleTab(() => notifications.refresh().catch(() => {}));
    const tabs = {
        news: new NewsTab(),
        profile: new SettingsTab(),
        glads: new GladsTab(),
        potions: new PotionsTab(),
        battle,
        report: new ReportsTab(),
        ranking: new RankingTab(),
        messages: new MessagesTab(),
        friends: new FriendsTab(),
    };
    tabs.profile.init();
    tabs.report.init();
    tabs.messages.init();
    tabs.friends.init();
    battle.init();
    tabs.ranking.init();
    tabs.potions.init();

    const menu = new PainelMenu({ element: document.querySelector('#painel-menu'), account: profile.user, counts: notifications.counts });
    const bar = new MobileTabBar({ element: document.querySelector('#painel-tabs') });
    const more = new MoreSheet();
    document.querySelector('#painel-more').append(more.element);
    bar.listen('more', () => more.open(bar.element.querySelector('[data-more]')));
    more.setAccount(profile.user);
    if (notifications.counts) more.setCounts(notifications.counts);

    const content = document.querySelector('#painel-content');
    const contents = [...document.querySelectorAll('#panel .content')];
    let rankingLoaded = false;


    /** One lifecycle adapter per existing controller; the old sections only need show(). */
    const adapters = Object.fromEntries(Object.entries(tabs).map(([section, tab]) => {
        const panel = contents.find(item => item.dataset.menu === section);
        return [section, {
            panel,
            mount: (route, signal) => {
                panel.classList.add('open');
                return Promise.resolve(tab.show?.(route, { signal }));
            },
            update: (route, signal) => Promise.resolve(tab.show?.(route, { signal })),
            unmount: () => {
                if (typeof tab.unmount === 'function') tab.unmount();
                else if (typeof tab.abort === 'function') tab.abort();
                panel.classList.remove('open');
            },
        }];
    }));

    let currentSection = null;
    let currentAdapter = null;
    let controller = null;
    let generation = 0;
    let sectionErrorToast = null;

    const reportError = (error, retry, signal) => {
        if (isAborted(error)) return;
        sectionErrorToast?.dismiss();
        sectionErrorToast?.remove();
        sectionErrorToast = retryableError('Não foi possível carregar esta seção. Tente novamente.', retry, signal);
    };

    const show = async (route, { focus = false } = {}) => {
        if (!route) return;
        sectionErrorToast?.dismiss();
        sectionErrorToast?.remove();
        sectionErrorToast = null;
        const same = currentSection === route.section;
        const token = ++generation;
        if (!same) {
            controller?.abort();
            currentAdapter?.unmount();
            currentSection = route.section;
            currentAdapter = adapters[route.section];
        }
        controller?.abort();
        controller = new AbortController();
        if (more.isOpen) more.close();
        menu.setActive(route.section);
        bar.setActive(route.section);
        document.title = `gladCode - ${sectionTitle(route.section)}`;
        try {
            if (same) await currentAdapter.update(route, controller.signal);
            else await currentAdapter.mount(route, controller.signal);
        }
        catch (error) {
            if (!token || token !== generation || controller.signal.aborted) return;
            reportError(error, () => show(route, { focus: false }), controller.signal);
            return;
        }
        if (token !== generation || controller.signal.aborted) return;
        events.emit(APP_EVENTS.navigationOpened, { section: route.section, href: sectionUrl(route) });
        if (!same) window.scrollTo({ top: 0, behavior: 'auto' });
        if (focus && !same) requestAnimationFrame(() => {
            const heading = content.querySelector('.content.open h1, .content.open h2');
            if (!heading) return;
            heading.tabIndex = -1;
            heading.focus();
        });
    };

    const navigate = (state, { push = false, replace = false, historyOnly = false, focus = true } = {}) => {
        if (!state) return;
        const url = sectionUrl(state);
        if (push) history.pushState({ painel: state }, '', url);
        else if (replace) history.replaceState({ painel: state }, '', url);
        if (!historyOnly) show(state, { focus });
    };

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target.closest?.('a[href]');
        if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
        const url = new URL(anchor.href, location);
        if (url.origin !== location.origin) return;
        const state = resolveRoute(url);
        if (!state) return;
        event.preventDefault();
        navigate(state, { push: true, focus: true });
    });

    window.addEventListener('popstate', () => show(resolveRoute(location), { focus: true }));

    const GO = Object.fromEntries(Object.entries(SECTION_SHORTCUTS).map(([section, letter]) => [letter, section]));
    let goPending = false;
    let goTimer = null;
    const resetGo = () => {
        goPending = false;
        if (goTimer) clearTimeout(goTimer);
        goTimer = null;
        menu.element.classList.remove('is-g-pending');
    };
    document.addEventListener('keydown', event => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
        if (event.ctrlKey || event.metaKey || event.altKey || isModalOpen()) return;
        const letter = event.key.toLowerCase();
        if (!goPending && letter === 'g') {
            event.preventDefault();
            goPending = true;
            menu.element.classList.add('is-g-pending');
            goTimer = setTimeout(resetGo, 1000);
            return;
        }
        if (!goPending) return;
        const section = GO[letter];
        resetGo();
        if (!section) return;
        event.preventDefault();
        navigate({ section, subtab: '', query: {} }, { push: true, focus: true });
    });

    events.on(APP_EVENTS.accountLoaded, ({ user }) => {
        if (!user) return;
        profile.user = user;
        menu.setAccount(user);
        more.setAccount(user);
    });
    events.on(APP_EVENTS.accountSaved, ({ user }) => {
        profile.user = user;
        menu.setAccount(user);
        more.setAccount(user);
    });
    events.on(APP_EVENTS.accountSilver, ({ silver }) => {
        if (profile.user) profile.user.silver = silver;
    });
    events.on(APP_EVENTS.notificationsCounts, counts => {
        if (!profile.user) return;
        profile.user.level = counts.user.level;
        profile.user.xp = counts.user.xp;
        profile.user.silver = counts.user.silver;
        menu.setAccount(profile.user);
        menu.setCounts(counts);
        bar.setCounts(counts);
        more.setCounts(counts);
        if (!rankingLoaded && counts.gladiators?.used > 0) {
            rankingLoaded = true;
            RankModel.myBestOffset().then(offset => menu.setRanking(offset + 1)).catch(() => {});
        }
    });

    const initial = resolveRoute(location) ?? { section: 'news', subtab: '', query: {} };
    await show(initial, { focus: false });
    if (notifications.counts) {
        menu.setCounts(notifications.counts);
        bar.setCounts(notifications.counts);
        more.setCounts(notifications.counts);
    }
}

start();
