import { APP_EVENTS, events } from '../helpers/event-bus.js';

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
 * Updates the user's silver and publishes the fact the shell and account menu read.
 *
 * @param {number|string} silver New amount.
 */
export function setSilver(silver) {
    profile.user.silver = parseInt(silver, 10);
    events.emit(APP_EVENTS.accountSilver, { silver: profile.user.silver });
}
