import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { UserModel } from '../models/user.js';

/**
 * The signed-in account and its per-field autosave state machine (docs/frontend/events.md, flow 2).
 * DOM-free: the section previews a choice, this service persists it and publishes the fact.
 */

/** Profile fields the Perfil section autosaves, one independent queue each. */
export const ACCOUNT_FIELDS = Object.freeze([
    'nickname', 'picture', 'language', 'theme', 'gladView',
    'preferences.message', 'preferences.friend', 'preferences.update', 'preferences.duel', 'preferences.tourn',
]);

const PREFERENCE_PREFIX = 'preferences.';

/** @param {string} field @returns {string|null} */
function preferenceKey(field) {
    return field.startsWith(PREFERENCE_PREFIX) ? field.slice(PREFERENCE_PREFIX.length) : null;
}

/**
 * The API body of one field. Preferences travel as a one-key patch, so two switches saved at once
 * update two independent columns instead of replacing the whole preference object.
 *
 * @param {string} field
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function bodyFor(field, value) {
    const key = preferenceKey(field);
    return key ? { preferences: { [key]: value } } : { [field]: value };
}

/**
 * @param {Record<string, any>|null} user
 * @param {string} field
 * @returns {unknown}
 */
function confirmedFrom(user, field) {
    const key = preferenceKey(field);
    return key ? (user?.preferences?.[key] ?? null) : (user?.[field] ?? null);
}

/** @returns {{ promise: Promise<any>, resolve: (value: any) => void, reject: (error: unknown) => void }} */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

/**
 * The account state machine. Every field has `confirmed` (last value the server accepted), `intent`
 * (latest value the user wants) and at most one request in flight. Fields never share a counter.
 *
 * A `save` resolves with `{ status, field, value, before, user?, error? }`:
 * - `saved`: the sent value is now `confirmed`;
 * - `superseded`: a newer intent (or navigation/sign-out) replaced it, so the caller must not touch
 *   the control or show an error;
 * - `refused`: the sent value was still the intent and the API refused it; the caller rolls the
 *   control back to `confirmed` and reports `error`.
 */
export class AccountService {
    #model;
    #bus;
    #user = null;
    #states = new Map();
    #epoch = 0;
    #signingOut = false;
    #signOut = null;

    /**
     * @param {object} [options] Test seams.
     * @param {typeof UserModel} [options.model]
     * @param {typeof events} [options.bus]
     */
    constructor({ model = UserModel, bus = events } = {}) {
        this.#model = model;
        this.#bus = bus;
    }

    /** @returns {Record<string, any>|null} The last account the API returned. */
    get user() {
        return this.#user;
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<Record<string, any>|null>}
     */
    async load({ signal } = {}) {
        const epoch = ++this.#epoch;
        const user = await this.#model.current({ signal });
        if (epoch !== this.#epoch) return null;
        this.#user = user ?? null;
        this.#states.clear();
        this.#bus.emit(APP_EVENTS.accountLoaded, { user: this.#user });
        return this.#user;
    }

    /**
     * The last value the API accepted for a field.
     *
     * @param {string} field
     * @returns {unknown}
     */
    confirmed(field) {
        return this.#state(field).confirmed;
    }

    /**
     * Whether the field still has a request in flight or an intent waiting to be sent.
     *
     * @param {string} field
     * @returns {boolean}
     */
    busy(field) {
        const state = this.#state(field);
        return Boolean(state.inFlight || state.waiting);
    }

    /**
     * Records a new intent for one field. If no request is in flight it is sent at once; otherwise it
     * becomes the next value, replacing any intent queued before it.
     *
     * @param {string} field One of {@link ACCOUNT_FIELDS}.
     * @param {unknown} value
     * @returns {Promise<{ status: 'saved'|'superseded'|'refused', field: string, value: unknown, before: unknown, user?: Record<string, any>, error?: unknown, signedOut?: boolean, unchanged?: boolean }>}
     */
    save(field, value) {
        if (!ACCOUNT_FIELDS.includes(field)) throw new TypeError(`Unknown account field "${field}".`);

        // A save while the session closes is already outdated and must not race the logout request.
        if (this.#signingOut) {
            return Promise.resolve({
                status: 'superseded', field, value, before: this.confirmed(field), signedOut: true,
            });
        }

        const state = this.#state(field);
        if (value === state.intent && (state.waiting || state.inFlight)) {
            return (state.waiting ?? state.inFlight).deferred.promise;
        }
        if (value === state.confirmed && !state.waiting && !state.inFlight) {
            return Promise.resolve({
                status: 'saved', field, value: state.confirmed, before: state.confirmed, user: this.#user, unchanged: true,
            });
        }

        const change = {
            value,
            before: state.confirmed,
            deferred: deferred(),
        };
        state.intent = value;
        if (state.waiting) {
            state.waiting.deferred.resolve({
                status: 'superseded', field, value: state.waiting.value, before: state.waiting.before, superseded: true,
            });
            state.waiting = null;
        }
        if (state.inFlight) {
            state.waiting = change;
        }
        else {
            state.inFlight = change;
            this.#send(field);
        }
        return change.deferred.promise;
    }

    /**
     * @param {number} silver New balance from a confirmed mutation.
     * @returns {this}
     */
    setSilver(silver) {
        this.#user = { ...(this.#user ?? {}), silver: Number(silver) };
        this.#bus.emit(APP_EVENTS.accountSilver, { silver: Number(silver) });
        return this;
    }

    /**
     * Ends the session and every field's queue. Concurrent calls share one request.
     *
     * @returns {Promise<void>}
     */
    signOut() {
        if (this.#signOut) return this.#signOut;
        this.#signingOut = true;
        this.#epoch += 1;
        for (const [field, state] of this.#states) {
            for (const job of [state.inFlight, state.waiting]) {
                job?.deferred.resolve({
                    status: 'superseded', field, value: job.value, before: job.before, superseded: true, signedOut: true,
                });
            }
            state.inFlight = null;
            state.waiting = null;
            state.intent = state.confirmed;
        }
        this.#signOut = this.#performSignOut();
        return this.#signOut;
    }

    async #performSignOut() {
        try {
            await this.#model.signOut();
        }
        catch (error) {
            this.#signingOut = false;
            this.#signOut = null;
            this.#bus.emit(APP_EVENTS.accountSignOutFailed, { error });
            throw error;
        }
        this.#user = null;
        this.#states.clear();
        this.#signingOut = false;
        this.#signOut = null;
        this.#bus.emit(APP_EVENTS.accountSignedOut, {});
    }

    /**
     * @param {string} field
     * @returns {{ confirmed: unknown, intent: unknown, inFlight: object|null, waiting: object|null }}
     */
    #state(field) {
        if (!ACCOUNT_FIELDS.includes(field)) throw new TypeError(`Unknown account field "${field}".`);
        if (!this.#states.has(field)) {
            const confirmed = confirmedFrom(this.#user, field);
            this.#states.set(field, { confirmed, intent: confirmed, inFlight: null, waiting: null });
        }
        return this.#states.get(field);
    }

    /**
     * Sends the in-flight value of one field and settles it. On success the sent value becomes
     * `confirmed` and the next intent, if any, is sent. On refusal the caller learns whether its value
     * was still wanted (`refused`) or already replaced (`superseded`).
     *
     * @param {string} field
     * @returns {Promise<void>}
     */
    async #send(field) {
        const state = this.#state(field);
        const job = state.inFlight;
        if (!job) return;
        const epoch = this.#epoch;

        try {
            const user = await this.#model.update(bodyFor(field, job.value));
            if (epoch !== this.#epoch) {
                job.deferred.resolve({
                    status: 'superseded', field, value: job.value, before: job.before, superseded: true, signedOut: true,
                });
                return;
            }
            const confirmed = confirmedFrom(user, field) ?? job.value;
            state.confirmed = confirmed;
            this.#applyUser(field, confirmed);
            this.#bus.emit(APP_EVENTS.accountSaved, {
                user: this.#user, changed: [field], field, value: confirmed, before: job.before,
            });
            state.inFlight = null;

            if (state.intent === confirmed) {
                if (state.waiting) {
                    state.waiting.deferred.resolve({
                        status: 'saved', field, value: confirmed, before: state.waiting.before, user: this.#user, unchanged: true,
                    });
                    state.waiting = null;
                }
                job.deferred.resolve({ status: 'saved', field, value: confirmed, before: job.before, user: this.#user });
            }
            else {
                job.deferred.resolve({
                    status: 'superseded', field, value: job.value, before: job.before, user: this.#user, superseded: true,
                });
                this.#advance(field);
            }
        }
        catch (error) {
            if (epoch !== this.#epoch) {
                job.deferred.resolve({
                    status: 'superseded', field, value: job.value, before: job.before, error, superseded: true, signedOut: true,
                });
                return;
            }
            state.inFlight = null;
            if (state.intent === job.value) {
                state.intent = state.confirmed;
                if (state.waiting) {
                    state.waiting.deferred.resolve({
                        status: 'superseded', field, value: state.waiting.value, before: state.waiting.before, superseded: true,
                    });
                    state.waiting = null;
                }
                job.deferred.resolve({
                    status: 'refused', field, value: job.value, before: job.before, error,
                });
            }
            else {
                job.deferred.resolve({
                    status: 'superseded', field, value: job.value, before: job.before, error, superseded: true,
                });
                this.#advance(field);
            }
        }
    }

    /**
     * Sends the newest queued intent after the previous request settled.
     *
     * @param {string} field
     */
    #advance(field) {
        const state = this.#state(field);
        if (state.intent === state.confirmed) return;
        const next = state.waiting;
        if (!next) return;
        state.waiting = null;
        state.inFlight = next;
        this.#send(field);
    }

    /**
     * Applies only the field this response owns, so a slower response for another field cannot
     * overwrite a newer confirmed value in the local account.
     *
     * @param {string} field
     * @param {unknown} value
     */
    #applyUser(field, value) {
        const user = { ...(this.#user ?? {}) };
        const key = preferenceKey(field);
        if (key) user.preferences = { ...(user.preferences ?? {}), [key]: value };
        else user[field] = value;
        this.#user = user;
    }
}

/** The page's account. */
export const account = new AccountService();
