import { NotificationModel } from '../models/social.js';
import { profile, setBadge, setSilver, xpToNextLevel } from './session.js';

/**
 * Refreshes the menu counters: level and xp bar, silver and the unread
 * badges of news, messages, friends, gladiators, battles and reports.
 *
 * @param {{ duelChallenges?: { count: number, refresh: () => void } }} [options]
 *   The duel challenge list, refreshed when its count is out of date.
 */
export async function checkNotifications({ duelChallenges } = {}) {
    const data = await NotificationModel.counts();
    const menu = document.querySelector('#menu');

    profile.user.lvl = data.user.lvl;
    profile.user.xp = data.user.xp;
    document.querySelector('#profile-ui #lvl span').textContent = data.user.lvl;
    const xp = parseInt(data.user.xp, 10);
    document.querySelector('#profile-ui #xp #filled').style.width = `${(xp / xpToNextLevel(data.user.lvl)) * 100}%`;
    setSilver(data.user.silver);

    setBadge(menu.querySelector('#messages .notification'), parseInt(data.messages, 10));
    setBadge(menu.querySelector('#news .notification'), parseInt(data.news, 10));
    setBadge(menu.querySelector('#friends .notification'), parseInt(data.friends, 10));
    setBadge(menu.querySelector('#glads .notification'), parseInt(data.glads.remaining, 10) + parseInt(data.glads.obsolete, 10));

    const duels = parseInt(data.duels, 10);
    setBadge(menu.querySelector('#battle .notification'), duels);
    setBadge(document.querySelector('#battle-container #duel .notification'), duels);
    if (duelChallenges && duelChallenges.count !== duels) duelChallenges.refresh();

    const ranked = parseInt(data.reports.ranked, 10);
    const duel = parseInt(data.reports.duel, 10);
    setBadge(menu.querySelector('#report .notification'), ranked + duel);
    const tabs = document.querySelector('#report-container');
    tabs.querySelector('#ranked.tab .notification')?.classList.toggle('empty', !(ranked > 0));
    tabs.querySelector('#duel.tab .notification')?.classList.toggle('empty', !(duel > 0));
}
