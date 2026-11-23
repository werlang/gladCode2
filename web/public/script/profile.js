import './blocks.js';
import { showDialog } from './components/dialog.js';
import { createToast } from './components/toast.js';
import { GoogleLogin } from './helpers/google-login.js';
import { TemplateVar } from './helpers/template-var.js';
import { GladiatorModel } from './models/gladiator.js';
import { UserModel } from './models/user.js';
import { BattleTab } from './profile/battle.js';
import { FriendsTab } from './profile/friends.js';
import { GladsTab } from './profile/glads.js';
import { MessagesTab } from './profile/messages.js';
import { NewsTab } from './profile/news.js';
import { checkNotifications } from './profile/notifications.js';
import { PotionsTab } from './profile/potions.js';
import { RankingTab } from './profile/ranking.js';
import { ReportsTab } from './profile/reports.js';
import { openableTab, profile } from './profile/session.js';
import { SettingsTab } from './profile/settings.js';
import { account } from './services/account.js';

/** How often the menu counters refresh, in ms (there is no push channel). */
const NOTIFICATIONS_MS = 30000;

/** Ends the session and goes to the front page; a refusal keeps the session and offers a retry. */
async function logout() {
    try {
        await account.signOut();
    }
    catch {
        createToast('Não foi possível sair. Tente novamente.', {
            type: 'error',
            action: { label: 'Tentar novamente', onClick: logout },
        });
        return;
    }
    GoogleLogin.removeCredential();
    location.href = '/';
}

/**
 * The profile page: a menu of tabs, each opened (and refreshed) by its entry.
 */
async function start() {
    document.querySelector('#header-container')?.classList.add('small-profile');
    document.querySelector('#header-profile')?.classList.add('here');

    profile.user = await account.load();
    if (!UserModel.isLogged(profile.user)) {
        // the front page asks to sign in and comes back to the requested tab
        const tab = TemplateVar.get('tab');
        location.replace(tab ? `/?login=${encodeURIComponent(tab)}` : '/');
        return;
    }

    document.querySelector('#profile-ui #picture img').src = profile.user.picture;
    document.querySelector('#profile-ui #nickname').textContent = profile.user.nickname;
    // credits stay hidden until tutor accounts are on sale
    document.querySelector('#menu #currencies #money')?.remove();
    document.querySelector('#menu #currencies').classList.remove('hidden');

    const battle = new BattleTab(() => {
        checkNotifications({ duelChallenges: battle.challenges });
        battle.show();
    });
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

    const items = document.querySelectorAll('#menu .item');
    const enabled = () => [...items].filter(item => !item.classList.contains('disabled')).map(item => item.id);
    const open = requested => {
        const id = openableTab(requested, enabled());
        const item = document.querySelector(`#menu #${CSS.escape(id)}.item`);
        if (id === 'logout') {
            logout();
            return;
        }
        document.querySelectorAll('#panel .content').forEach(content => {
            content.classList.toggle('open', content.dataset.menu === id);
        });
        items.forEach(other => other.classList.toggle('here', other === item));
        tabs[id]?.show();
    };
    items.forEach(item => item.addEventListener('click', () => {
        if (!item.classList.contains('disabled')) open(item.id);
    }));

    const glads = await GladiatorModel.list();
    if (!glads.length) {
        document.querySelector('#menu #battle').classList.add('disabled');
        showDialog('Você ainda não possui nenhum gladiador cadastrado. Deseja ir para o editor de gladiadores?', ['Sim', 'Não, obrigado'])
            .then(answer => {
                if (answer === 'Sim') location.href = 'editor';
            });
    }

    open(TemplateVar.get('tab') || 'profile');
    checkNotifications({ duelChallenges: battle.challenges });
    setInterval(() => {
        if (!document.hidden) checkNotifications({ duelChallenges: battle.challenges });
    }, NOTIFICATIONS_MS);
}

start();
