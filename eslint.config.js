import { createRequire } from 'node:module';
import globals from 'globals';

/** The gladCode API a JavaScript gladiator calls: the names Payload/gladCodeAPI.js exports. */
const gladiatorApi = Object.fromEntries(
    Object.keys(createRequire(import.meta.url)('./Payload/gladCodeAPI.js')).map(name => [name, 'readonly']),
);
/** Functions a gladiator declares for the engine (or a sample shows), never called in its own code. */
const gladiatorEntryPoints = '^(setup|loop|upgrade)$';

/** Libraries the pages load as classic scripts before the modules run. */
const pageLibraries = {
    ace: 'readonly',
    Blockly: 'readonly',
    cloudinary: 'readonly',
    Croppie: 'readonly',
    google: 'readonly',
    gtag: 'readonly',
    Phaser: 'readonly',
    Prism: 'readonly',
    THREE: 'readonly',
};

const rules = {
    'no-undef': 'error',
    'no-var': 'error',
    'no-redeclare': 'error',
    'no-dupe-keys': 'error',
    'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
    'no-unused-vars': ['warn', { args: 'none' }],
    'prefer-const': 'warn',
    'no-unreachable': 'warn',
};

export default [
    {
        // vendored libraries stay as shipped; the engine test with a syntax error cannot be parsed
        ignores: ['web/public/script/phaser.js', 'web/public/script/croppie.js', 'api/node_modules/**', 'tests/engine/glads/jssyntax.js'],
    },
    {
        files: ['web/public/script/**/*.js'],
        // the API reference samples are gladiator code (below)
        ignores: ['web/public/script/functions/samples/**'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: { ...globals.browser, ...pageLibraries },
        },
        rules,
    },
    {
        files: ['api/**/*.js', 'web/*.js', 'web/middleware/**/*.js', 'web/helpers/**/*.js', 'web/scripts/**/*.js'],
        ignores: ['api/node_modules/**', 'web/node_modules/**'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules,
    },
    {
        // the classic Phaser renderer predates the modules: it shares page globals
        // and var-scoped state, so only the correctness rules apply until it is rewritten
        files: ['web/public/script/render.js', 'web/public/script/floatingText.js'],
        languageOptions: { sourceType: 'script' },
        rules: {
            'no-undef': 'off',
            'no-var': 'off',
            'no-redeclare': 'off',
            'no-use-before-define': 'off',
            'no-unused-vars': 'off',
            'prefer-const': 'off',
        },
    },
    {
        // the JavaScript gladiator client (CommonJS, run by Node in the gladcode2-vm image)
        files: ['Payload/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules,
    },
    {
        // JavaScript gladiators: classic scripts whose globals are the gladCode API, so a sample
        // that calls a function the engine does not have fails here
        files: ['web/public/script/functions/samples/**/*.js', 'tests/engine/glads/**/*.js'],
        // the crash fixtures call an undefined function on purpose
        ignores: ['tests/engine/glads/jscrash_*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'script',
            globals: gladiatorApi,
        },
        rules: { ...rules, 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: gladiatorEntryPoints }] },
    },
    {
        // the engine tests also forge stderr output through Node
        files: ['tests/engine/glads/**/*.js'],
        languageOptions: { globals: { process: 'readonly' } },
    },
];
