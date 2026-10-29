import { describe, expect, test } from 'vitest';
import { Validate } from '../../../helpers/validation.js';

describe('request validation', () => {
    test('ids refuse injection payloads and anything but whole numbers', () => {
        for (const payload of ['0 OR cod=699', '0 OR 1=1', "699' UNION SELECT 1--", '1.5', '', '12abc', ['1', '2']]) {
            expect(() => Validate.integer(payload, 'id', { min: 1 })).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_ID' }));
        }
        expect(Validate.integer('892', 'id', { min: 1 })).toBe(892);
        expect(() => Validate.integer('0', 'id', { min: 1 })).toThrow(expect.objectContaining({ code: 'INVALID_ID' }));
        expect(() => Validate.integer('-5', 'id', { min: 1 })).toThrow(expect.objectContaining({ code: 'INVALID_ID' }));
        expect(Validate.integer(undefined, 'id', { optional: true })).toBeUndefined();
    });

    test('text is trimmed, bounded and matched whole', () => {
        expect(Validate.text('  Ana  ', 'name')).toBe('Ana');
        expect(() => Validate.text('a'.repeat(51), 'name', { max: 50 })).toThrow(expect.objectContaining({ code: 'INVALID_NAME' }));
        expect(() => Validate.text('../../etc/passwd', 'hash', { pattern: /^[a-f0-9]+$/ })).toThrow(expect.objectContaining({ code: 'INVALID_HASH' }));
        expect(() => Validate.text(42, 'name')).toThrow(expect.objectContaining({ code: 'INVALID_NAME' }));
    });

    test('emoji are refused where the text meets a utf8mb3 column, accented text is not', () => {
        expect(Validate.text('Ação é ñ 中文', 'search')).toBe('Ação é ñ 中文');
        expect(() => Validate.text('gladiador 😀', 'search')).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_SEARCH' }));
        expect(Validate.text('printf("😀");', 'source', { wide: true })).toBe('printf("😀");');
    });

    test('choices and flags take only their exact values', () => {
        expect(Validate.oneOf('update', 'mode', ['create', 'update'])).toBe('update');
        expect(() => Validate.oneOf('drop', 'mode', ['create', 'update'])).toThrow(expect.objectContaining({ code: 'INVALID_MODE' }));
        expect(() => Validate.boolean('true', 'flex')).toThrow(expect.objectContaining({ code: 'INVALID_FLEX' }));
        expect(() => Validate.integer(1, 'maxMinutes', { max: 0 })).toThrow(expect.objectContaining({ code: 'INVALID_MAX_MINUTES' }));
    });
});
