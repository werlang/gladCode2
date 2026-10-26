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

    profile.user.level = data.user.level;
    profile.user.xp = data.user.xp;
    document.querySelector('#profile-ui #lvl span').textContent = data.user.level;
    const xp = data.user.xp;
    document.querySelector('#profile-ui #xp #filled').style.width = `${(xp / xpToNextLevel(data.user.level)) * 100}%`;
    setSilver(data.user.silver);

    setBadge(menu.querySelector('#messages .notification'), data.messages);
    setBadge(menu.querySelector('#news .notification'), data.news);
    setBadge(menu.querySelector('#friends .notification'), data.friends);
    setBadge(menu.querySelector('#glads .notification'), data.gladiators.remaining + data.gladiators.outdated);

    const { duels } = data;
    setBadge(menu.querySelector('#battle .notification'), duels);
    setBadge(document.querySelector('#battle-container #duel .notification'), duels);
    if (duelChallenges && duelChallenges.count !== duels) duelChallenges.refresh();

    const { ranked } = data.reports;
    const { duel } = data.reports;
    setBadge(menu.querySelector('#report .notification'), ranked + duel);
    const tabs = document.querySelector('#report-container');
    tabs.querySelector('#ranked.tab .notification')?.classList.toggle('empty', !(ranked > 0));
    tabs.querySelector('#duel.tab .notification')?.classList.toggle('empty', !(duel > 0));
}
