/// <reference types="vitest/config" />
import { defineConfig, version as viteVersion } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

const require = createRequire(import.meta.url)

function git(args: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// Build facts shown in the About dialog and the admin dashboard
// (src/composables/useBuildInfo.ts). scripts/push.sh sets VITE_APP_VERSION to
// the release tag; other builds describe the checkout (e.g. v1.2.1-3-gabc1234-dirty).
const appBuild = {
  version: process.env.VITE_APP_VERSION || git('describe --tags --always --dirty') || 'dev',
  commit: git('rev-parse --short HEAD'),
  buildTime: new Date().toISOString(),
  toolchain: {
    node: process.versions.node,
    vite: viteVersion,
    vue: require('vue/package.json').version as string,
    typescript: require('typescript/package.json').version as string,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_BUILD__: JSON.stringify(appBuild),
  },
  server: {
    port: 5180,
    strictPort: true,
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
