/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/component/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules', '.next'],
    css: false,
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      COMPACTION_WINDOW_DAYS: '30',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
