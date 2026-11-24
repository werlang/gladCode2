/** Largest message the engine reads in one `recv`: it asks for 2000 bytes. */
const MESSAGE_BYTES = 1999;

/**
 * Cuts a protocol message to a whole number of UTF-8 code points. Backing up only over an
 * incomplete final sequence preserves a legitimate U+FFFD that was fully inside the prefix.
 *
 * @param {string} message
 * @returns {string}
 */
function limitMessage(message) {
    const data = Buffer.from(message, 'utf8');
    if (data.length <= MESSAGE_BYTES) return message;
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    for (let end = MESSAGE_BYTES; end > 0; end--) {
        try {
            return decoder.decode(data.subarray(0, end));
        }
        catch {
            // The cut split a UTF-8 sequence; try one byte earlier.
        }
    }
    return '';
}

module.exports = { MESSAGE_BYTES, limitMessage };
