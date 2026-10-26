const ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escapes text for safe use inside HTML content or a quoted attribute.
 *
 * @param {unknown} value Text to escape; `null` and `undefined` become ''.
 * @returns {string}
 */
export function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, char => ESCAPES[char]);
}

/**
 * Matches `{{{raw}}}` (first, so its prefix is not taken) or `{{escaped}}`.
 */
const PLACEHOLDER = /\{\{\{([a-zA-Z0-9_]+)\}\}\}|\{\{([a-zA-Z0-9_]+)\}\}/g;

/**
 * Fills a template's placeholders: `{{key}}` is escaped, `{{{key}}}` is
 * inserted as is (for fragments already rendered by this function).
 *
 * Templates hold markup only; callers choose variants and map lists before
 * rendering. Values are never re-scanned, so content cannot inject placeholders.
 *
 * @param {string} template Markup with placeholders.
 * @param {Record<string, unknown>} [data] Values by placeholder name.
 * @returns {string} Rendered markup.
 * @throws {Error} When a placeholder has no key in `data`.
 */
export function renderTemplate(template, data = {}) {
    return template.replace(PLACEHOLDER, (match, rawKey, escapedKey) => {
        const key = rawKey ?? escapedKey;
        if (!Object.hasOwn(data, key)) {
            throw new Error(`Unknown template placeholder "${key}"`);
        }
        const value = data[key];
        if (value == null) return '';
        return rawKey !== undefined ? String(value) : escapeHtml(value);
    });
}

/**
 * Parses markup into a single element.
 *
 * @param {string} markup HTML with one root element.
 * @returns {HTMLElement}
 */
export function createElement(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    return /** @type {HTMLElement} */ (template.content.firstElementChild);
}
