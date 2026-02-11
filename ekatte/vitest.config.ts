import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.js'],
    coverage: {
      enabled: true,
      provider: 'v8'
    },
  },
})