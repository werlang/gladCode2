import { Message } from '../components/dialog.js';
import { noCreditTemplate, tutorPitchTemplate } from '../templates/profile-ranking.js';

/** Where tutors read about the school plan (credit recharge is not online yet). */
const PLANS_PAGE = 'about#plans';

/**
 * Invites a regular account to become a tutor account.
 */
export function showTutorPitch() {
    new Message({
        message: tutorPitchTemplate,
        buttons: { no: 'NÃO', yes: 'SABER MAIS' },
        class: 'school large',
    }).show().click('yes', () => window.open(PLANS_PAGE));
}

/**
 * Tells a tutor their credits ran out.
 */
export function showNoCredit() {
    new Message({
        message: noCreditTemplate,
        buttons: { no: 'CANCELAR', yes: 'RECARREGAR' },
        class: 'school',
    }).show().click('yes', () => window.open(PLANS_PAGE));
}
