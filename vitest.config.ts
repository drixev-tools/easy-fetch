import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      enabled: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      clean: true,
      include: ['src/**/*.ts'],
      exclude: ['dist/*.*', 'check/*.js', 'src/types/**'],
    },
  },
});
