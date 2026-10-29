import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const deliver = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: deliver }) } }));

const { sendMail } = await import('../../../helpers/email.js');

const recipients = [{ email: 'a@example.com', name: 'Ana' }, { email: 'b@example.com', name: 'Bo' }, { email: 'c@example.com', name: 'Cy' }];

describe('sendMail', () => {
    beforeEach(() => {
        deliver.mockReset().mockResolvedValue({});
        vi.stubEnv('MAILER_HOST', 'smtp.example.com');
        vi.stubEnv('MAILER_USER', 'bot');
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => vi.unstubAllEnvs());

    test('a failed delivery or follow-up never stops the other recipients', async () => {
        deliver.mockRejectedValueOnce(new Error('mailbox full'));
        const onSent = vi.fn().mockRejectedValueOnce(new Error('database down'));

        expect(await sendMail('update', { subject: 'Nova versão', recipients, onSent })).toEqual({ sent: 2, failed: 1 });
        expect(deliver).toHaveBeenCalledTimes(3);
        expect(onSent.mock.calls.map(([recipient]) => recipient.name)).toEqual(['Bo', 'Cy']);
    });
});
