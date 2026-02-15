import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    environmentMatchGlobs: [
      ['server/**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx', 'server/**/*.ts'],
      exclude: ['**/*.test.*', '**/types/**', '**/data/**'],
    },
  },
});
