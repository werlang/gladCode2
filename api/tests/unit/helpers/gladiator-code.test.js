import { describe, expect, test } from 'vitest';
import {
    attributeCost, bannedFunctionsUsed, detectLanguage, engineSource, hasValidSetup, insertBreakpoints,
    prepareEditorSource, readDeclarations, setupBlock, stripSetup, validAttributes,
} from '../../../helpers/gladiator-code.js';

const C_SETUP = 'setup(){\n    setName("Zed");\n    setSTR(10);\n    setAGI(18);\n    setINT(0);\n}\n\n';

describe('gladiator code helpers', () => {
    test('attributes cost ceil(value / 6) per point and must spend exactly 50', () => {
        expect([0, 1, 6, 7, 12, 30].map(attributeCost)).toEqual([0, 1, 6, 8, 18, 90]);
        expect(validAttributes(10, 18, 0)).toBe(true);
        expect(validAttributes(14, 14, 2)).toBe(true);
        expect(validAttributes(30, 0, 0)).toBe(false);
        expect(validAttributes(10.5, 18, 0)).toBe(false);
    });

    test('the language is Python when the code defines loop() the Python way', () => {
        expect(detectLanguage('def loop():\n    pass')).toBe('python');
        expect(detectLanguage('loop(){}')).toBe('c');
    });

    test('a setup is valid only when its attributes spend the budget', () => {
        expect(hasValidSetup(`${C_SETUP}loop(){}`)).toBe(true);
        expect(hasValidSetup('setup(){ setSTR(30); }')).toBe(false);
        expect(hasValidSetup('loop(){}')).toBe(false);
    });

    test('generated setups quote the name and nick safely', () => {
        const c = setupBlock('c', { name: 'Zed', nick: 'a"b\\c', vstr: 10, vagi: 18, vint: 0, slots: '0,0,0,0' });
        expect(c).toContain('setName("Zed@a\\"b\\\\c");');
        expect(c.endsWith('}\n\n')).toBe(true);
        expect(setupBlock('python', { name: 'Zed', nick: 'n', vstr: 1, vagi: 2, vint: 3, slots: '1,0,0,0' })).toContain('# start of user code\n');
    });

    test('editor sources lose their skin and user calls and tag the name with the nick', () => {
        const source = `setup(){\n    setName("Zed");\n    setSTR(10);\n    setSkin("[\\"male\\"]");\n    setUser("Ana");\n}\n\nloop(){}`;
        const prepared = prepareEditorSource(source, 'user0');
        expect(prepared).toMatchObject({ name: 'Zed', nick: 'Ana', skin: '[\\"male\\"]' });
        expect(prepared.code).toContain('setName("Zed@Ana")');
        expect(prepared.code).not.toMatch(/setSkin|setUser/);
        expect(prepareEditorSource('setup(){ setName("X"); setSpritesheet("abc"); }', 'user3')).toMatchObject({ nick: 'user3', skin: 'abc' });
    });

    test('breakpoints go before the chosen user lines', () => {
        const code = `${C_SETUP}loop(){\n    if (a)\n        stepForward();\n}`;
        const result = insertBreakpoints(code, [2]).split('\n');
        const at = result.indexOf('breakpoint("if (a){");');
        expect(at).toBeGreaterThan(-1);
        expect(result[at + 1]).toBe('    if (a){');

        const python = 'def setup():\n    setSTR(1)\n# start of user code\ndef loop():\n    stepForward()\n';
        expect(insertBreakpoints(python, [2])).toContain('    breakpoint("stepForward()")\n    stepForward()');
    });

    test('engine sources include the C core or the Python main loop', () => {
        expect(engineSource('loop(){}')).toEqual({ file: 'c', text: '#include "gladCodeCore.c"\nloop(){}' });
        expect(engineSource('def loop():\n    pass').text).toContain('initClient()');
    });

    test('declarations, test-only functions and the setup can be read off a source', () => {
        expect(readDeclarations(`${C_SETUP.replace('}', '    setSpritesheet("abc123");\n}')}loop(){}`)).toEqual({ name: 'Zed', vstr: 10, vagi: 18, vint: 0, spritesheet: 'abc123' });
        expect(bannedFunctionsUsed('loop(){ setHp(10); lvlUp(); }', ['setHp', 'lvlUp', 'setAp'])).toEqual(['setHp', 'lvlUp']);
        expect(stripSetup(`${C_SETUP}loop(){}`)).toBe('loop(){}');
    });
});
