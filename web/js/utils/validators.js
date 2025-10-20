/**
 * Validation utilities
 * Input validation and data sanitization functions
 */

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean}
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate number
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function isNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function isInteger(value) {
    return Number.isInteger(Number(value));
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean}
 */
export function isLength(value, min, max) {
    const length = value.length;
    return length >= min && length <= max;
}

/**
 * Validate string matches pattern
 * @param {string} value - String to validate
 * @param {RegExp} pattern - Pattern to match
 * @returns {boolean}
 */
export function matches(value, pattern) {
    return pattern.test(value);
}

/**
 * Sanitize HTML string
 * @param {string} html - HTML to sanitize
 * @returns {string}
 */
export function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string}
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Strip HTML tags
 * @param {string} html - HTML to strip
 * @returns {string}
 */
export function stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Validate form field
 * @param {HTMLInputElement} field - Form field
 * @returns {object} Validation result {valid, errors}
 */
export function validateField(field) {
    const errors = [];

    // Required
    if (field.hasAttribute('required') && isEmpty(field.value)) {
        errors.push('Este campo é obrigatório');
    }

    // Email
    if (field.type === 'email' && !isEmpty(field.value) && !isEmail(field.value)) {
        errors.push('Digite um email válido');
    }

    // URL
    if (field.type === 'url' && !isEmpty(field.value) && !isURL(field.value)) {
        errors.push('Digite uma URL válida');
    }

    // Number
    if (field.type === 'number' && !isEmpty(field.value)) {
        if (!isNumber(field.value)) {
            errors.push('Digite um número válido');
        }
        
        const value = Number(field.value);
        const min = field.getAttribute('min');
        const max = field.getAttribute('max');
        
        if (min !== null && value < Number(min)) {
            errors.push(`O valor mínimo é ${min}`);
        }
        
        if (max !== null && value > Number(max)) {
            errors.push(`O valor máximo é ${max}`);
        }
    }

    // Length
    const minLength = field.getAttribute('minlength');
    const maxLength = field.getAttribute('maxlength');
    
    if (minLength !== null && field.value.length < Number(minLength)) {
        errors.push(`Mínimo de ${minLength} caracteres`);
    }
    
    if (maxLength !== null && field.value.length > Number(maxLength)) {
        errors.push(`Máximo de ${maxLength} caracteres`);
    }

    // Pattern
    const pattern = field.getAttribute('pattern');
    if (pattern && !isEmpty(field.value)) {
        const re = new RegExp(pattern);
        if (!re.test(field.value)) {
            errors.push('Formato inválido');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate entire form
 * @param {HTMLFormElement} form - Form element
 * @returns {object} Validation result {valid, errors}
 */
export function validateForm(form) {
    const fields = form.querySelectorAll('input, textarea, select');
    const allErrors = {};
    let isValid = true;

    fields.forEach((field) => {
        if (field.name) {
            const result = validateField(field);
            if (!result.valid) {
                allErrors[field.name] = result.errors;
                isValid = false;
            }
        }
    });

    return {
        valid: isValid,
        errors: allErrors,
    };
}
