/**
 * Indents or outdents a textarea's selection with tabs, like a code editor:
 * Tab inserts a tab (or indents every selected line), Shift+Tab removes one.
 *
 * @param {HTMLTextAreaElement} field Textarea.
 * @param {boolean} [outdent] Remove indentation instead.
 */
export function insertTab(field, outdent = false) {
    const { selectionStart: start, selectionEnd: end, value } = field;

    if (start === end) {
        if (outdent) {
            const tab = value.lastIndexOf('\t', start - 1);
            if (tab < 0) return;
            field.value = value.slice(0, tab) + value.slice(tab + 1);
            field.setSelectionRange(start - 1, start - 1);
        }
        else {
            field.value = `${value.slice(0, start)}\t${value.slice(end)}`;
            field.setSelectionRange(start + 1, start + 1);
        }
        return;
    }

    let selection = value.slice(start, end);
    let delta = 0;
    if (outdent) {
        selection = selection.replace(/^(\t| {2})/gm, match => {
            delta -= match.length;
            return '';
        });
    }
    else {
        selection = selection.replace(/([\w\W]*?\n)/gm, line => {
            delta++;
            return `\t${line}`;
        });
    }
    field.value = value.slice(0, start) + selection + value.slice(end);
    field.setSelectionRange(start, end + delta);
}

/**
 * Puts the caret at the end of an editable element.
 *
 * @param {HTMLElement} element Content-editable element.
 */
export function caretToEnd(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * A short random id of lowercase letters and digits.
 *
 * @param {number} size Length.
 * @returns {string}
 */
export function randomId(size) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}
