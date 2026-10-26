/**
 * The gladiator name to show for one entry of a simulation's `glads`: its
 * `name`, or the `setName("...")` in its code.
 *
 * @param {object|string|number} glad Gladiator object, source code or id.
 * @returns {string|null}
 */
function gladName(glad) {
    if (glad && typeof glad === 'object') return glad.name ?? null;
    if (typeof glad === 'string') return glad.match(/setName\("([\w\W]*?)"\)/)?.[1] ?? null;
    return null;
}

/**
 * Rewrites compiler output so it names the gladiators instead of their
 * `code<i>.c` / `code<i>.py` files.
 *
 * @param {string} error Compiler output.
 * @param {Array<object|string|number>} glads The simulation's gladiators.
 * @returns {string}
 */
export function nameGladiators(error, glads = []) {
    let text = error.split('/usercode/').join('');
    glads.forEach((glad, index) => {
        const name = gladName(glad);
        if (!name) return;
        text = text.split(`code${index}.c`).join(`<span>${name}</span>`);
        text = text.split(`code${index}.py`).join(`<span>${name}</span>`);
    });
    return text.replace(/\\n/g, '\n');
}

/**
 * What went wrong with a simulation, worded for the player.
 *
 * @param {unknown} data back_simulation.php answer (an object, or text when it broke).
 * @param {Array<object|string|number>} [glads] The simulation's gladiators.
 * @returns {{ title: string, message: string }|null} `null` when the battle ran fine.
 */
export function simulationProblem(data, glads = []) {
    if (!data || typeof data !== 'object') {
        return {
            title: 'ERRO EM TEMPO DE EXECUÇÃO',
            message: 'Algum de seus gladiadores ocasionou um erro na simulação enquanto ela estava sendo executada.\nVerifique seus códigos-fonte e tente novamente.',
        };
    }

    if (data.error === 'NO_OUTPUT') {
        return {
            title: 'ERRO NA SIMULAÇÃO',
            message: 'A simulação não produziu saída. Provavelmente um ou mais gladiadores causaram o problema. Tente novamente.',
        };
    }
    if (data.error === 'INVALID_ATTR') {
        return {
            title: 'ERRO DE VALIDAÇÃO',
            message: 'Os atributos de um dos gladiadores não são válidos ou sua pontuação não corresponde às regras da gladCode',
        };
    }
    if (data.error) {
        return { title: 'ERRO DE SINTAXE', message: nameGladiators(String(data.error), glads) };
    }

    const output = String(data.output ?? '');
    if (output === 'CLIENT TIMEOUT') {
        return {
            title: 'ERRO NA SIMULAÇÃO',
            message: "A gladCode está tendo problemas entre a conexão do simulador e os gladiadores. Por favor, reporte este problema para <a href='mailto:contato@gladcode.dev'><span>contato@gladcode.dev</span></a>",
        };
    }
    if (output.includes('timed out')) {
        const glad = output.split('Gladiator ')[1]?.split(' timed out')[0] ?? '';
        return {
            title: 'GLADIADOR EM LOOP',
            message: `O código do gladiador <span>${glad}</span> está em uma repetição da qual não consegue sair.\nEle foi desativado para não comprometer a simulação.\n\nRevise o código-fonte e tente novamente.`,
        };
    }
    return null;
}
