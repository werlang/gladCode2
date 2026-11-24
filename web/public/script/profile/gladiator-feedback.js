import { showMessage } from '../components/dialog.js';
import { escapeHtml } from '../helpers/html.js';

/**
 * The shared explanation for a picker card that cannot be chosen: a broken gladiator must be fixed,
 * an outdated one must be saved again. The name is escaped before it enters the message markup.
 *
 * @param {Record<string, any>} gladiator
 * @returns {string}
 */
export function blockedGladiatorMessage(gladiator) {
    const name = `<span class='highlight'>${escapeHtml(gladiator?.name ?? 'Este gladiador')}</span>`;
    return gladiator?.broken
        ? `O gladiador ${name} travou na última batalha. Corrija-o no editor.`
        : `O gladiador ${name} precisa ser gravado novamente no editor.`;
}

/**
 * Shows the shared blocked-gladiator message.
 *
 * @param {Record<string, any>} gladiator
 * @returns {Promise<boolean>}
 */
export function showBlockedGladiator(gladiator) {
    return showMessage(blockedGladiatorMessage(gladiator));
}
