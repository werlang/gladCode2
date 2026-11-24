/**
 * Gladiator slot copy shared by the Gladiadores header and the Painel rail. Legacy accounts can own
 * more gladiators than the current level allows, so a count must never be printed as “N/M” when N > M.
 *
 * @param {number|string} used
 * @param {number|string} limit
 * @returns {{ used: number, limit: number, over: boolean, full: boolean, canAdd: boolean,
 *   badge: string, subtitle: string, reason: string }}
 */
export function gladiatorSlots(used, limit) {
    const count = Math.max(0, Number(used) || 0);
    const max = Math.max(0, Number(limit) || 0);
    const over = max > 0 && count > max;
    const full = max > 0 && count >= max;
    const noun = max === 1 ? 'gladiador' : 'gladiadores';
    return {
        used: count,
        limit: max,
        over,
        full,
        canAdd: !full,
        badge: max > 0 && !over ? `${count}/${max}` : String(count),
        subtitle: over
            ? `${count} gladiadores · seu nível permite ${max}. Grave no editor para atualizar a versão do motor.`
            : `${count} de ${max} vagas ocupadas. Grave no editor para atualizar a versão do motor.`,
        reason: `Seu nível permite ${max} ${noun}.`,
    };
}
