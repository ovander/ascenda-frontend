/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    // The VM sandbox prevents unlinking existing dist files, so we keep them
    // and let Vite overwrite them in place.
    emptyOutDir: false,
    // Neither lightningcss (arm64 native missing) nor esbuild is available in
    // this VM sandbox — disable CSS minification so the build completes.
    cssMinify: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: '/tmp/vitest-coverage-report',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/test/**', 'src/**/*.spec.ts', 'src/**/*.d.ts', 'src/main.ts'],
    },
  },
})
