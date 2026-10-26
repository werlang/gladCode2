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
