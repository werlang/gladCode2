import globals from 'globals';

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
        // vendored libraries stay as shipped
        ignores: ['web/public/script/phaser.js', 'web/public/script/croppie.js', 'api/node_modules/**'],
    },
    {
        files: ['web/public/script/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: { ...globals.browser, ...pageLibraries },
        },
        rules,
    },
    {
        files: ['api/**/*.js', 'web/*.js', 'web/middleware/**/*.js', 'web/helpers/**/*.js'],
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
];
