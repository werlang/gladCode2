/**
 * Rewrites compiler output so it names the gladiators instead of their `code<i>.c` / `code<i>.py` /
 * `code<i>.js` files. The output is text: it is escaped here, so the result is HTML.
 *
 * @param {string} error Compiler output.
 * @param {Array<string|null|undefined>} [names] Gladiator names in battle order.
 * @returns {string} HTML.
 */
export function nameGladiators(error, names = []) {
    let text = escapeText(error.split('/usercode/').join(''));
    names.forEach((name, index) => {
        if (!name) return;
        const label = `<span>${escapeText(name)}</span>`;
        text = text.split(`code${index}.c`).join(label);
        text = text.split(`code${index}.py`).join(label);
        text = text.split(`code${index}.js`).join(label);
    });
    return text.replace(/\\n/g, '\n');
}

/**
 * @param {string} text
 * @returns {string} The text with HTML special characters escaped.
 */
function escapeText(text) {
    return String(text).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

/**
 * What went wrong with a battle run, worded for the player.
 *
 * @param {{ hash?: string|null, error?: string }|null} data The run's answer.
 * @param {Array<string|null|undefined>} [names] Gladiator names in battle order.
 * @returns {{ title: string, message: string }|null} `null` when the battle ran fine.
 */
export function simulationProblem(data, names = []) {
    const error = String(data?.error ?? '');
    if (!error) return null;

    if (error === 'NO_OUTPUT') {
        return {
            title: 'ERRO NA SIMULAÇÃO',
            message: 'A simulação não produziu saída. Provavelmente um ou mais gladiadores causaram o problema. Tente novamente.',
        };
    }
    if (error === 'INVALID_ATTR') {
        return {
            title: 'ERRO DE VALIDAÇÃO',
            message: 'Os atributos de um dos gladiadores não são válidos ou sua pontuação não corresponde às regras da gladCode',
        };
    }
    return { title: 'ERRO DE SINTAXE', message: nameGladiators(error, names) };
}
