import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './tests/reports/coverage',
      exclude: ['node_modules', 'tests', '.next', 'cypress', 'scripts'],
    },
    reporters: ['verbose', 'html', 'json'],
    outputFile: {
      html: './tests/reports/vitest/index.html',
      json: './tests/reports/vitest/results.json',
    },
  },
})
