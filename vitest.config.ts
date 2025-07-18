import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/__setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
