/** The kinds of potion the shop groups, in board order. */
export const POTION_KINDS = Object.freeze([
    { value: 'hp', label: 'Vida' },
    { value: 'ap', label: 'Habilidade' },
    { value: 'attr', label: 'Atributos' },
    { value: 'xp', label: 'Experiência' },
]);

/**
 * The kind of a potion from its engine identifier (`pot-hp-1`, `pot-ap-2`, `pot-high-1`, `pot-xp-1`).
 *
 * @param {string} identifier
 * @returns {'hp'|'ap'|'attr'|'xp'}
 */
export function potionKind(identifier) {
    const id = String(identifier ?? '');
    if (id.startsWith('pot-ap')) return 'ap';
    if (id.startsWith('pot-high') || id.startsWith('pot-low')) return 'attr';
    if (id.startsWith('pot-xp')) return 'xp';
    return 'hp';
}

/**
 * The human label of a potion kind.
 *
 * @param {string} kind
 * @returns {string}
 */
export function potionKindLabel(kind) {
    return POTION_KINDS.find(entry => entry.value === kind)?.label ?? 'Vida';
}

/**
 * The chips for a catalogue: Todas plus every kind the API actually returned.
 *
 * @param {Array<{ kind?: string }>} potions
 * @returns {Array<{ value: string, label: string }>}
 */
export function potionFilters(potions = []) {
    const present = new Set(potions.map(potion => potion.kind ?? 'hp'));
    return [
        { value: 'all', label: 'Todas' },
        ...POTION_KINDS.filter(kind => present.has(kind.value)),
    ];
}
