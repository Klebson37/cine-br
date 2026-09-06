import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Extensão .mts para o Vite carregar como ESM nativo.
// A resolução de "@/..." vem do tsconfig, nativamente — o antigo
// plugin vite-tsconfig-paths virou redundante nesta versão.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
})
