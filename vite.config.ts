/// <reference types="vitest/config" />
import { defineConfig, version as viteVersion, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
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

// public/landing.html is copied as-is, outside Vite's HTML pipeline, so it
// cannot read import.meta.env. Its %VITE_API_BASE_URL% placeholder is filled
// in the built copy, from the same .env files as the app.
function landingApiBase(): Plugin {
  let apiBase = ''
  let outDir = ''
  return {
    name: 'landing-api-base',
    apply: 'build',
    configResolved(config) {
      apiBase = config.env.VITE_API_BASE_URL || ''
      outDir = config.build.outDir.startsWith('/') ? config.build.outDir : join(config.root, config.build.outDir)
    },
    writeBundle() {
      const file = join(outDir, 'landing.html')
      if (!existsSync(file)) return
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('%VITE_API_BASE_URL%', apiBase))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), landingApiBase()],
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
