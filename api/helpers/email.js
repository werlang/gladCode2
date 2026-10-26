import { readFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';

const TEMPLATES = path.join(import.meta.dirname, '../templates/mail');
const SENDER = { name: 'gladCode', address: 'gladbot@gladcode.dev' };
/** Mail templates the API sends, by name (`templates/mail/mail_<name>.html`). */
const TEMPLATE_NAMES = new Set(['message', 'friend', 'duel', 'tournament', 'update']);

let transport = null;

/**
 * @param {unknown} value
 * @returns {string} The value with HTML special characters escaped.
 */
export function escapeMailText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

/**
 * Fills a mail template's `{{name}}` placeholders. Values are escaped unless listed in `raw`.
 *
 * @param {string} template Template HTML.
 * @param {Record<string, unknown>} vars
 * @param {string[]} [raw] Names whose values are trusted HTML (e.g. a release summary).
 * @returns {string}
 */
export function fillTemplate(template, vars, raw = []) {
    return template.replace(/(?:\{\{|%7B%7B)(\w+)(?:\}\}|%7D%7D)/g, (match, name) => {
        if (!Object.hasOwn(vars, name)) return match;
        return raw.includes(name) ? String(vars[name]) : escapeMailText(vars[name]);
    });
}

/** @returns {import('nodemailer').Transporter|null} The SMTP transport, or null when mail is not configured. */
function smtp() {
    if (!process.env.MAILER_HOST || !process.env.MAILER_USER) return null;
    transport ??= nodemailer.createTransport({
        host: process.env.MAILER_HOST,
        port: Number(process.env.MAILER_PORT || 587),
        secure: Number(process.env.MAILER_PORT) === 465,
        auth: { user: process.env.MAILER_USER, pass: process.env.MAILER_PASSWORD },
    });
    return transport;
}

/**
 * Sends one templated email per recipient (SMTP from `MAILER_*`). Without SMTP settings (local
 * development) the mail is only logged. Failures are logged, never thrown: a notification email
 * must not undo the action that caused it.
 *
 * @param {string} template Template name (`message`, `friend`, `duel`, `tournament`, `update`).
 * @param {{ subject: string, recipients: Array<{ email: string, name: string, vars?: Record<string, unknown> }>, vars?: Record<string, unknown>, raw?: string[], onSent?: (recipient: { email: string, name: string }) => Promise<void>|void }} mail
 *   `vars` are shared; each recipient's `vars` are added to them. `onSent` runs after each email that went out.
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendMail(template, { subject, recipients, vars = {}, raw = [], onSent }) {
    if (!TEMPLATE_NAMES.has(template)) throw new Error(`Unknown mail template: ${template}`);
    const html = await readFile(path.join(TEMPLATES, `mail_${template}.html`), 'utf8');
    const transporter = smtp();
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
        const body = fillTemplate(html, { ...vars, ...recipient.vars }, raw);
        if (!transporter) {
            if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify({ event: 'mail_skipped', template, subject, to: recipient.email }));
            continue;
        }
        try {
            await transporter.sendMail({ from: SENDER, to: { name: recipient.name, address: recipient.email }, subject, html: body });
        }
        catch (error) {
            failed++;
            console.error(`Mail "${template}" to ${recipient.email} failed:`, error.message);
            continue;
        }
        sent++;
        await onSent?.(recipient);
    }
    return { sent, failed };
}
