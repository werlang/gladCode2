/**
 * Copies text to the clipboard.
 *
 * Uses the Clipboard API, falling back to a hidden field and `execCommand`
 * where the API is missing (pages served over plain HTTP).
 *
 * @param {string} text Text to copy.
 * @returns {Promise<boolean>} Whether it was copied.
 */
export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        return copied;
    }
}
