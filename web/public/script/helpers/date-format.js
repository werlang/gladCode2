const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Describes a span of minutes by its largest unit, e.g. "3 dias".
 *
 * @param {number} minutes Elapsed minutes.
 * @returns {string}
 */
export function elapsedString(minutes) {
    let min = Math.trunc(minutes);
    let hour = Math.trunc(min / 60);
    min %= 60;
    let day = Math.trunc(hour / 24);
    hour %= 24;
    const month = Math.trunc(day / 30);
    day %= 30;

    if (month > 0) return `${month} meses`;
    if (day > 0) return `${day} dias`;
    if (hour > 0) return `${hour} horas`;
    return `${min} minutos`;
}

/**
 * Formats a message timestamp in Portuguese.
 *
 * @param {string|number|Date} time Timestamp.
 * @param {{ short?: boolean, monthFull?: boolean }} [options]
 *   `short` gives the elapsed time ("5 minutos"); otherwise the date reads
 *   "3 de jan de 2024 às 09:05", with the full month name when `monthFull`.
 * @returns {string}
 */
export function formatMessageTime(time, { short = false, monthFull = false } = {}) {
    const date = new Date(time);
    if (short) {
        return elapsedString((Date.now() - date.getTime()) / 60000);
    }

    const month = monthFull ? MONTHS[date.getMonth()] : MONTHS[date.getMonth()].toLowerCase().slice(0, 3);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${date.getDate()} de ${month} de ${date.getFullYear()} às ${hours}:${minutes}`;
}

/**
 * Splits a duration into zero-padded hours, minutes and seconds; a negative
 * duration reads as zero.
 *
 * @param {number} ms Duration in milliseconds.
 * @returns {[string, string, string]}
 */
export function splitDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const pad = value => String(value).padStart(2, '0');
    return [pad(Math.floor(total / 3600)), pad(Math.floor(total / 60) % 60), pad(total % 60)];
}

/**
 * A news date as “18 de novembro” (day and full month, no year).
 *
 * @param {string|number|Date} time
 * @returns {string}
 */
export function formatDayMonth(time) {
    const date = new Date(time);
    return `${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()}`;
}

/**
 * A compact month label for list rows: “NOV”.
 *
 * @param {string|number|Date} time
 * @returns {string}
 */
export function formatShortMonth(time) {
    return MONTHS[new Date(time).getMonth()].toUpperCase().slice(0, 3);
}

/**
 * A month and year for “na gladCode desde …”: “março de 2019”.
 *
 * @param {string|number|Date} time
 * @returns {string}
 */
export function formatMonthYear(time) {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';
    return `${MONTHS[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;
}
