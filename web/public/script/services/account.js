import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { UserModel } from '../models/user.js';

/**
 * The signed-in account and the per-field autosave queue (docs/frontend/events.md, flow 2).
 * DOM-free: the section previews a choice, this service persists it and publishes the fact.
 */

/** Profile fields the Perfil section autosaves. */
export const ACCOUNT_FIELDS = Object.freeze(['nickname', 'picture', 'language', 'preferences', 'theme', 'gladView']);

/**
 * @typedef {object} SaveToken
 * @property {string} field The field's queue.
 * @property {number} rev Revision in that queue.
 * @property {unknown} previous The value persisted before this change.
 */

/** @returns {{ promise: Promise<any>, resolve: Function, reject: Function }} */
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
 * Account state and its autosave queue. One request per field is in flight; the latest intent wins,
 * superseded responses never touch the preview, and each save's token carries its field.
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
     * The last value the API confirmed for a field (the rollback base).
     *
     * @param {string} field
     * @returns {unknown}
     */
    confirmed(field) {
        return this.#states.get(field)?.confirmed ?? this.#user?.[field] ?? null;
    }

    /**
     * Whether a save token still belongs to its field's current revision.
     *
     * @param {SaveToken|{ field?: string, rev?: number }|null} token
     * @returns {boolean}
     */
    isCurrent(token) {
        if (!token?.field) return false;
        return this.#states.get(token.field)?.seq === token.rev;
    }

    /**
     * Saves one field. The promise resolves with `{ token, user }` when that revision is confirmed, or
     * `{ token, superseded: true }` when a newer intent replaced it. A failure of the current revision
     * rejects; a superseded failure resolves as superseded and changes nothing.
     *
     * With `merge`, the value is a patch: consecutive patches to the same object field are folded
     * together and applied over the value confirmed when the request runs, so changing two e-mail
     * preferences quickly persists both instead of the second object replacing the first.
     *
     * @param {string} field One of {@link ACCOUNT_FIELDS}.
     * @param {unknown} value
     * @param {{ merge?: boolean }} [options]
     * @returns {Promise<{ token: SaveToken, user?: Record<string, any>, superseded?: boolean, signedOut?: boolean, error?: unknown }>}
     */
    save(field, value, { merge = false } = {}) {
        if (!ACCOUNT_FIELDS.includes(field)) throw new TypeError(`Unknown account field "${field}".`);

        // A save that arrives while the session is closing is already outdated; it must not race
        // the logout request or be lost in the state cleared after a confirmed sign-out.
        if (this.#signingOut) {
            return Promise.resolve({
                token: { field, rev: -1, previous: this.confirmed(field) },
                superseded: true,
                signedOut: true,
            });
        }

        const state = this.#state(field);
        let patch = merge ? { ...(value ?? {}) } : null;
        let previous = merge
            ? { ...(state.confirmed ?? this.#user?.[field] ?? {}) }
            : state.confirmed;

        if (state.pending) {
            const pending = state.pending;
            // Two patches queued before the first request runs become one write with the earliest
            // rollback base; resolving the dropped waiter keeps its caller from hanging.
            if (merge && pending.merge) {
                patch = { ...pending.patch, ...patch };
                previous = pending.token.previous;
            }
            pending.waiter.resolve({ token: pending.token, superseded: true });
        }

        const token = { field, rev: ++state.seq, previous };
        const waiter = deferred();
        state.pending = { value, token, waiter, merge, patch };
        if (!state.running) this.#drain(field);
        return waiter.promise;
    }

    /**
     * Restores the value captured before a change. The restore is itself saved through the same
     * field's queue; a token superseded by a later change to that field is ignored.
     *
     * @param {SaveToken} token
     * @returns {Promise<any>}
     */
    undo(token) {
        const state = token?.field ? this.#states.get(token.field) : null;
        if (!state || token.rev !== state.seq) return Promise.resolve({ ignored: true });
        return this.save(token.field, token.previous);
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
        for (const state of this.#states.values()) {
            if (state.pending) {
                state.pending.waiter.resolve({ token: state.pending.token, superseded: true, signedOut: true });
                state.pending = null;
            }
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
     * @returns {{ seq: number, confirmed: unknown, pending: object|null, running: boolean }}
     */
    #state(field) {
        if (!this.#states.has(field)) {
            this.#states.set(field, {
                seq: 0,
                confirmed: this.#user?.[field] ?? null,
                pending: null,
                running: false,
            });
        }
        return this.#states.get(field);
    }

    /**
     * Sends the pending value of one field, then the next one if a newer intent arrived meanwhile.
     *
     * @param {string} field
     */
    async #drain(field) {
        const state = this.#state(field);
        if (state.running || !state.pending) return;

        const job = state.pending;
        state.pending = null;
        state.running = true;
        const epoch = this.#epoch;

        try {
            // A merged patch is applied when it runs, so it includes whatever an earlier write for
            // this field confirmed in the meantime.
            const value = job.merge
                ? { ...(state.confirmed ?? this.#user?.[field] ?? {}), ...job.patch }
                : job.value;
            const user = await this.#model.update({ [field]: value });
            if (epoch !== this.#epoch) {
                job.waiter.resolve({ token: job.token, superseded: true, signedOut: true });
                return;
            }
            state.confirmed = user?.[field] ?? value;
            if (job.token.rev === state.seq) {
                this.#user = user;
                this.#bus.emit(APP_EVENTS.accountSaved, { user, changed: [field] });
                job.waiter.resolve({ token: job.token, user });
            }
            else {
                job.waiter.resolve({ token: job.token, user, superseded: true });
            }
        }
        catch (error) {
            if (epoch !== this.#epoch) job.waiter.resolve({ token: job.token, error, superseded: true, signedOut: true });
            else if (job.token.rev === state.seq) job.waiter.reject(error);
            else job.waiter.resolve({ token: job.token, error, superseded: true });
        }
        finally {
            state.running = false;
            if (state.pending) this.#drain(field);
        }
    }
}

/** The page's account. */
export const account = new AccountService();
