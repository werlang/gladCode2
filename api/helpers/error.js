/**
 * API error with an HTTP status, a stable machine-readable code and optional details.
 * Routes and models throw it for expected failures; `middleware/error.js` turns it into JSON.
 */
export class CustomError extends Error {
    /**
     * @param {number} status HTTP status code.
     * @param {string} message Human-readable message.
     * @param {string} [code] Stable error code the frontend resolves (e.g. `NICKNAME_TAKEN`).
     * @param {unknown} [data] Optional payload sent with the error.
     */
    constructor(status, message, code, data) {
        super(message);
        this.status = status;
        this.code = code;
        this.data = data;
    }
}
