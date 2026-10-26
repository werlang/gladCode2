import { CustomError } from './error.js';

/**
 * Request input checks. Each returns the clean value or throws a 400 `CustomError` with a stable
 * code naming the field, so the frontend can say what was wrong.
 */
export class Validate {
    /**
     * @param {unknown} value
     * @param {string} field Field name used in the error code (`INVALID_<FIELD>`).
     * @param {{ min?: number, max?: number, pattern?: RegExp, optional?: boolean }} [options]
     * @returns {string|undefined} The trimmed text; undefined when optional and absent.
     */
    static text(value, field, { min = 1, max = 255, pattern, optional = false } = {}) {
        if (value === undefined && optional) return undefined;
        const text = typeof value === 'string' ? value.trim() : '';
        if (text.length < min || text.length > max || (pattern && !pattern.test(text))) {
            throw Validate.error(field);
        }
        return text;
    }

    /**
     * @param {unknown} value
     * @param {string} field
     * @param {{ min?: number, max?: number, optional?: boolean }} [options]
     * @returns {number|undefined}
     */
    static integer(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, optional = false } = {}) {
        if ((value === undefined || value === null || value === '') && optional) return undefined;
        const number = Number(value);
        if (!Number.isInteger(number) || number < min || number > max) throw Validate.error(field);
        return number;
    }

    /**
     * @param {unknown} value
     * @param {string} field
     * @param {readonly unknown[]} options Allowed values.
     * @param {{ optional?: boolean }} [settings]
     * @returns {any}
     */
    static oneOf(value, field, options, { optional = false } = {}) {
        if (value === undefined && optional) return undefined;
        if (!options.includes(value)) throw Validate.error(field);
        return value;
    }

    /**
     * @param {unknown} value
     * @param {string} field
     * @param {{ optional?: boolean }} [options]
     * @returns {boolean|undefined}
     */
    static boolean(value, field, { optional = false } = {}) {
        if (value === undefined && optional) return undefined;
        if (typeof value !== 'boolean') throw Validate.error(field);
        return value;
    }

    /**
     * @param {string} field
     * @returns {CustomError} 400 `INVALID_<FIELD>`.
     */
    static error(field) {
        const code = `INVALID_${field.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`;
        return new CustomError(400, `Invalid ${field}.`, code);
    }
}
