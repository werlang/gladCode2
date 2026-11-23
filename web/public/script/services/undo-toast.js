import { createToast } from '../components/toast.js';
import { escapeHtml } from '../helpers/html.js';
import { writeErrorToast } from '../helpers/section-request.js';
import { account } from './account.js';

/** The one-line name of each field in the undo toast. */
const LABELS = {
    nickname: 'Apelido alterado',
    picture: 'Foto alterada',
    language: 'Linguagem alterada',
    theme: 'Tema alterado',
    gladView: 'Visual dos gladiadores alterado',
    'preferences.message': 'Mensagens recebidas alteradas',
    'preferences.duel': 'Desafios de duelo alterados',
    'preferences.friend': 'Convites de amizade alterados',
    'preferences.update': 'Novidades da gladCode alteradas',
    'preferences.tourn': 'Rodadas de torneios e treinos alteradas',
};

/**
 * The single undo toast of the page (docs/frontend/events.md, flow 2). Every change calls `begin()`,
 * which invalidates the previous undo. A successful change calls `show()` with that token, so an
 * older response can never resurrect an undo for a change the user already replaced. Clicking
 * “Desfazer” is a normal change of the same field back to `before`; it is not a retry and never shows
 * a new undo toast.
 */
class UndoToast {
    #token = 0;
    #toast = null;

    /**
     * Starts a new change: dismisses the visible undo and returns the token the eventual success must
     * present to `show()`.
     *
     * @returns {number}
     */
    begin() {
        this.#token += 1;
        this.#remove();
        return this.#token;
    }

    /**
     * Shows the undo for the latest change, if no newer change started since it was sent.
     *
     * @param {number} token The value `begin()` returned when the change started.
     * @param {{ field: string, before: unknown, restore: (value: unknown) => void }} change
     * @returns {void}
     */
    show(token, { field, before, restore }) {
        if (token !== this.#token) return;
        this.#remove();
        const message = escapeHtml(LABELS[field] ?? 'Alteração salva');
        this.#toast = createToast(message, {
            type: 'success',
            action: {
                label: 'Desfazer',
                onClick: async () => {
                    // The undo is a normal change: remove the toast at once, preview the old value
                    // and let the field's queue confirm or refuse it.
                    this.#remove();
                    this.#token += 1;
                    restore?.(before);
                    const result = await account.save(field, before);
                    if (result.status === 'refused') {
                        restore?.(account.confirmed(field));
                        writeErrorToast(result.error);
                    }
                    else if (result.status === 'saved') {
                        restore?.(account.confirmed(field));
                    }
                },
            },
        });
    }

    /** Removes the tracked toast immediately, cancelling its fade and action. */
    #remove() {
        const toast = this.#toast;
        this.#toast = null;
        if (!toast) return;
        if (typeof toast.dismissNow === 'function') toast.dismissNow();
        else toast.dismiss?.();
    }
}

/** The page's one undo toast. */
export const undoToast = new UndoToast();
