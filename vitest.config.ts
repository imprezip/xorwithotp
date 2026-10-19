import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts on purpose: the unit tests cover the pure
// TypeScript crypto layer only, so no React plugin (and no Vite type clash).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
