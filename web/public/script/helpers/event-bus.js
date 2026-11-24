/**
 * The page's single application event bus (docs/frontend/events.md).
 *
 * It is DOM-free: an `EventTarget` subclass with a constant map of event names and typed payloads.
 * Services and the page entry emit facts; the shell and services listen; components receive data
 * through their setters. `on()` returns an unsubscribe function and accepts an `AbortSignal`.
 */

/**
 * @typedef {object} AccountLoadedDetail
 * @property {object} user The signed-in account.
 */

/**
 * @typedef {object} AccountSavedDetail
 * @property {object} user The account as the API returned it.
 * @property {string[]} changed The profile fields that changed.
 */

/**
 * @typedef {object} AccountSilverDetail
 * @property {number} silver The master's silver balance.
 */

/**
 * @typedef {object} AccountSignOutFailedDetail
 * @property {unknown} error Why the logout request failed.
 */

/**
 * @typedef {object} ThemeChangedDetail
 * @property {'system'|'classic'|'arena-light'|'arena-dark'} choice
 * @property {'classic'|'arena-light'|'arena-dark'} theme
 */

/**
 * @typedef {object} GladViewChangedDetail
 * @property {'sprite'|'3d'} choice
 */

/**
 * @typedef {object} PotionSlotView
 * @property {number} id
 * @property {string} identifier
 * @property {string} name
 * @property {string} icon
 * @property {string} expiresAt Server-time timestamp (`YYYY-MM-DD HH:MM:SS`).
 * @property {number} seconds Time left when the API answered.
 */

/**
 * @typedef {object} NotificationCounts
 * @property {string} version The running engine version from `api/version`.
 * @property {{ level: number, xp: number, silver: number }} user
 * @property {number} messages
 * @property {number} news
 * @property {number} friends
 * @property {{ used: number, limit: number, remaining: number, outdated: number }} gladiators
 * @property {number} duels
 * @property {{ ranked: number, duel: number }} reports
 * @property {{ count: number, nextExpiry: string|null, serverNow: string }} potions
 * @property {number} bell
 */

/**
 * @typedef {'news'|'profile'|'glads'|'potions'|'battle'|'report'|'ranking'|'messages'|'friends'} SectionId
 */

/**
 * @typedef {object} NavigationOpenedDetail
 * @property {SectionId} section
 * @property {string} href
 */

/**
 * @typedef {object} MessagesReadDetail
 * @property {number} userId The other master's user id (the conversation key).
 * @property {number} read Messages marked read.
 * @property {number} unreadTotal Authoritative unread message count.
 */

/**
 * @typedef {object} FriendsAnsweredDetail
 * @property {number} id The pending friendship id.
 * @property {boolean} accepted
 */

/**
 * @typedef {object} GladiatorView
 * @property {number} id
 * @property {string} name
 * @property {number} mmr
 * @property {string} skin
 */

/**
 * @typedef {object} GladiatorChosenDetail
 * @property {GladiatorView} gladiator
 * @property {'ranked'|'duel'|'tournament'|'training'} mode
 */

/**
 * @typedef {object} PotionsOrderedDetail
 * @property {PotionSlotView[]} slots
 * @property {string} serverNow
 * @property {number} silver
 */

/**
 * @typedef {object} PotionsReconciledDetail
 * @property {PotionSlotView[]} slots
 * @property {string} serverNow
 * @property {number} silver
 */

/**
 * @typedef {object} RankingJumpedDetail
 * @property {number|null} gladiatorId
 * @property {number} position The resolved window position.
 */

/**
 * @typedef {object} PaletteOpenedDetail
 * @property {'keyboard'|'button'} source
 */

/**
 * @typedef {object} PaletteNavigatedDetail
 * @property {SectionId|null} section
 * @property {string} href
 */

/** The only event names the bus accepts; each value has a typedef above. */
export const APP_EVENTS = Object.freeze({
    accountLoaded: 'account:loaded',
    accountSaved: 'account:saved',
    accountSilver: 'account:silver',
    accountSignedOut: 'account:signed-out',
    accountSignOutFailed: 'account:sign-out-failed',
    themeChanged: 'theme:changed',
    gladViewChanged: 'glad-view:changed',
    notificationsCounts: 'notifications:counts',
    navigationOpened: 'navigation:opened',
    messagesRead: 'messages:read',
    messagesOpened: 'messages:opened',
    friendsAnswered: 'friends:answered',
    potionsOrdered: 'potions:ordered',
    potionsReconciled: 'potions:reconciled',
    potionsCancelled: 'potions:cancelled',
    gladiatorChosen: 'gladiator:chosen',
    rankingJumped: 'ranking:jumped',
    rankingTopped: 'ranking:topped',
    paletteOpened: 'palette:opened',
    paletteNavigated: 'palette:navigated',
});

const NAMES = new Set(Object.values(APP_EVENTS));

/**
 * The app event bus. One instance (`events`) is exported; modules never construct another.
 */
export class EventBus extends EventTarget {
    /**
     * Subscribes to an app event.
     *
     * @param {string} name One of `APP_EVENTS`' values.
     * @param {(detail: any) => void} handler Receives the event detail (not the `CustomEvent`).
     * @param {{ signal?: AbortSignal }} [options] `signal` unsubscribes on abort.
     * @returns {() => void} Unsubscribe.
     * @throws {TypeError} When the name is not declared in `APP_EVENTS`.
     */
    on(name, handler, { signal } = {}) {
        this.#assertName(name);
        if (typeof handler !== 'function') throw new TypeError(`Event handler for "${name}" is not a function.`);

        const listener = event => handler(event.detail);
        this.addEventListener(name, listener, signal ? { signal } : undefined);
        return () => this.removeEventListener(name, listener);
    }

    /**
     * Publishes an app event synchronously.
     *
     * @param {string} name One of `APP_EVENTS`' values.
     * @param {any} [detail]
     * @returns {boolean} Whether the event was not cancelled.
     * @throws {TypeError} When the name is not declared in `APP_EVENTS`.
     */
    emit(name, detail) {
        this.#assertName(name);
        return this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    /**
     * @param {unknown} name
     * @throws {TypeError} When the name is unknown.
     */
    #assertName(name) {
        if (!NAMES.has(name)) throw new TypeError(`Unknown app event "${name}".`);
    }
}

/** The page's only bus. */
export const events = new EventBus();
