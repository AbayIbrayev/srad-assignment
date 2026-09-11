/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const HOST = '127.0.0.1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { host: HOST },
  preview: { host: HOST },
  test: {
    environment: 'jsdom',
    globals: true,
    // Times are rendered for the operator, so a test asserting on one must not
    // depend on the machine that runs it.
    env: { TZ: 'UTC' },
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
