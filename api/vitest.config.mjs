import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/unit/**/*.test.js'],
        environment: 'node',
        clearMocks: true,
        env: { NODE_ENV: 'test' },
    },
});
