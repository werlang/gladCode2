import { showLoginDialog } from './components/header.js';
import { CommandPalette } from './components/command-palette.js';
import { showMessage } from './components/dialog.js';
import { AppHeader } from './components/app-header.js';
import { createToast, isModalOpen } from './components/toast.js';
import { GoogleLogin } from './helpers/google-login.js';
import { TemplateVar } from './helpers/template-var.js';
import { APP_EVENTS, events } from './helpers/event-bus.js';
import { applyTheme, storedThemeChoice } from './helpers/theme.js';
import { previewTheme } from './helpers/theme-preview.js';
import { account } from './services/account.js';
import { notifications } from './services/notifications.js';
import { PAINEL_COMMANDS, searchShell } from './services/command-search.js';
import { NotificationModel } from './models/social.js';
import { UserModel } from './models/user.js';

/** The header's current section for the gold underline. */
function activeFor(path) {
    if (/^\/(news|profile|glads|potion|battle|reports|ranking|messages|friends)(\/|$|\.)/.test(path)) return 'painel';
    if (/^\/(editor|newglad|glad-)/.test(path)) return 'editor';
    if (/^\/manual/.test(path) || /^\/(docs|function|funcao)/.test(path)) return 'aprender';
    if (/^\/(about|creditos|stats|post)/.test(path)) return 'sobre';
    return 'none';
}

/** The shortcuts window opened by `?` and the account menu. */
function showShortcuts() {
    showMessage(`<strong>Atalhos</strong>
        <ul>
            <li><kbd>Ctrl K</kbd> — busca global</li>
            <li><kbd>G</kbd> + inicial — ir para uma seção</li>
            <li><kbd>?</kbd> — esta janela</li>
            <li><kbd>Esc</kbd> — fecha menus e diálogos</li>
        </ul>`);
}

/** The header on every page that renders the shared partial. */
async function start() {
    const element = document.querySelector('#app-header');
    if (!element) return;
    const header = new AppHeader({ element, active: activeFor(location.pathname) });
    let palette = null;
    const ensurePalette = () => {
        if (!palette) {
            palette = new CommandPalette({
                commands: PAINEL_COMMANDS,
                search: (text, signal) => searchShell(text, { signal }),
            });
            document.body.append(palette.element);
            palette.listen('navigate', detail => events.emit(APP_EVENTS.paletteNavigated, detail));
            palette.listen('close', () => header.setSearching(false));
        }
        return palette;
    };
    /** Closes the header panels first, then refuses while any other modal owns the focus. */
    const canOpenPalette = () => {
        if (palette?.isOpen) return false;
        header.closePanels();
        return !isModalOpen();
    };
    const openPalette = source => query => {
        if (!canOpenPalette()) return;
        events.emit(APP_EVENTS.paletteOpened, { source });
        ensurePalette().open({ query });
        header.setSearching(true);
    };

    header.listen('sign-in', () => showLoginDialog());
    header.listen('search', detail => openPalette('button')(detail.query));
    header.listen('shortcuts', () => showShortcuts());
    header.listen('notifications', async () => {
        try {
            header.setNotifications(await notifications.feed());
        }
        catch {
            header.setNotifications({ needs: [], news: [] });
        }
    });
    let themeToast = null;
    let themeRequest = 0;
    header.listen('theme-select', async ({ choice }) => {
        if (!account.user) {
            applyTheme(choice);
            return;
        }
        const request = ++themeRequest;
        themeToast?.dismiss();
        themeToast = null;
        const result = await previewTheme({
            choice,
            previous: account.confirmed('theme'),
            fallback: storedThemeChoice,
            apply: applyTheme,
            save: (field, value) => account.save(field, value),
            isCurrent: () => request === themeRequest,
        });
        if (result.status === 'failed') {
            if (request === themeRequest) {
                createToast(result.error?.code === 'NOT_SIGNED_IN' ? 'Entre para salvar o tema' : 'Não foi possível salvar o tema', 'error');
            }
            return;
        }
        if (result.status !== 'saved' || request !== themeRequest) return;
        themeToast = createToast(`Tema alterado para ${choice === 'classic' ? 'Clássico' : choice === 'arena-dark' ? 'Arena escuro' : 'Arena claro'}`, {
            action: {
                label: 'Desfazer',
                onClick: async () => {
                    const restored = await account.undo(result.token);
                    if (restored?.user && !restored.superseded) applyTheme(result.previous);
                },
            },
        });
    });
    header.listen('sign-out', async () => {
        try {
            await account.signOut();
        }
        catch {
            createToast('Não foi possível sair. Tente novamente.', {
                type: 'error',
                action: { label: 'Tentar novamente', onClick: () => header.emit('sign-out', {}) },
            });
            return;
        }
        GoogleLogin.removeCredential();
        location.assign('/');
    });
    header.listen('read-all', async () => {
        try {
            await NotificationModel.markRead();
            await notifications.refresh();
            createToast('Notificações marcadas como lidas', 'success');
        }
        catch {
            createToast('Não foi possível marcar as notificações', 'error');
        }
    });

    const onKey = event => {
        const tag = document.activeElement?.tagName;
        const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            if (!canOpenPalette()) return;
            event.preventDefault();
            openPalette('keyboard')('');
        }
        else if (event.key === '/' && !typing) {
            if (!canOpenPalette()) return;
            event.preventDefault();
            openPalette('keyboard')('');
        }
        else if (event.key === '?' && !typing) {
            header.closePanels();
            if (isModalOpen()) return;
            event.preventDefault();
            showShortcuts();
        }
    };
    document.addEventListener('keydown', onKey);

    events.on(APP_EVENTS.accountLoaded, ({ user }) => {
        header.setAccount(user);
        if (user?.id) notifications.start();
    });
    events.on(APP_EVENTS.accountSaved, ({ user }) => header.setAccount(user));
    events.on(APP_EVENTS.accountSilver, ({ silver }) => header.setSilver(silver));
    events.on(APP_EVENTS.accountSignedOut, () => {
        notifications.stop();
        header.setAccount(null);
    });
    events.on(APP_EVENTS.notificationsCounts, counts => {
        header.setCounts(counts);
        if (account.user) header.setAccount({ ...account.user, level: counts.user.level, xp: counts.user.xp, silver: counts.user.silver });
    });
    events.on(APP_EVENTS.navigationOpened, () => {
        header.setActive('painel');
        header.closePanels();
    });
    events.on(APP_EVENTS.themeChanged, ({ choice }) => header.setTheme(choice));

    header.setAccount(account.user);
    const googleClientId = TemplateVar.get('googleClientId');
    if (googleClientId) {
        GoogleLogin.onSignIn(async credential => {
            try {
                await UserModel.signIn(credential);
            }
            catch (error) {
                if (error.code === 'GOOGLE_ACCOUNT_MISMATCH') {
                    showMessage('Este e-mail pertence a uma conta ligada a outra conta Google. Entre com a conta Google original ou fale com contato@gladcode.dev');
                }
                else createToast('Não foi possível entrar. Tente novamente.', 'error');
                return;
            }
            location.assign('/news');
        });
    }
    const user = await account.load().catch(() => null);
    if (user?.id) {
        notifications.start();
        applyTheme(user.theme || storedThemeChoice());
    }
    else applyTheme(storedThemeChoice());
    if (googleClientId) {
        GoogleLogin.init()
            .then(() => {
                if (!user?.id) GoogleLogin.prompt().catch(() => {});
            })
            .catch(() => {});
    }
}

start();
