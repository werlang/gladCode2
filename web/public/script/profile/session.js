/**
 * The signed-in user as the profile page sees it: loaded once, then kept up
 * to date as battles, purchases and notifications change level, xp and silver.
 */
export const profile = {
    /** @type {Record<string, any>|null} */
    user: null,
};

/**
 * Experience a master needs to pass a level.
 *
 * @param {number|string} level Master level.
 * @returns {number}
 */
export function xpToNextLevel(level) {
    return (parseInt(level, 10) * 1.9 + 1) * 130;
}

/**
 * Updates the user's silver and the counter in the menu.
 *
 * @param {number|string} silver New amount.
 */
export function setSilver(silver) {
    profile.user.silver = parseInt(silver, 10);
    const counter = document.querySelector('#menu #currencies #silver span');
    if (counter) counter.textContent = profile.user.silver;
}

/**
 * Turns a menu entry's notification badge on or off.
 *
 * @param {Element|null} badge `.notification` element.
 * @param {number} count Count shown; 0 hides it.
 */
export function setBadge(badge, count) {
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle('empty', !(count > 0));
}

/**
 * The profile tab a menu request opens: the requested one when its menu entry exists and is
 * enabled, the settings tab otherwise (an unknown `?t=`, or battles before the first gladiator).
 *
 * @param {string|undefined} requested Tab id from the address.
 * @param {Iterable<string>} enabled Ids of the enabled menu entries.
 * @returns {string}
 */
export function openableTab(requested, enabled) {
    return requested && [...enabled].includes(requested) ? requested : 'profile';
}
