/// <reference types="vitest/config" />
import { defineConfig, version as viteVersion, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
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

// The SPA talks to its own origin only: the backend's BFF holds the tokens and
// the browser sends its session cookie to this host, so the build pins
// connect-src to 'self' (plus the Sentry ingest origin when VITE_SENTRY_DSN is
// set). Sign-in at Socrate is a navigation, not a request. public/landing.html
// carries the same policy in its own <meta>.
export function contentSecurityPolicy(env: Record<string, string>): string {
  const connect = ["'self'"]
  if (env.VITE_SENTRY_DSN) {
    try {
      connect.push(new URL(env.VITE_SENTRY_DSN).origin)
    } catch {
      throw new Error(`VITE_SENTRY_DSN is not a URL: "${env.VITE_SENTRY_DSN}"`)
    }
  }
  return `connect-src ${connect.join(' ')}; object-src 'none'; base-uri 'self'`
}

function cspMeta(): Plugin {
  let policy = ''
  return {
    name: 'csp-meta',
    apply: 'build',
    configResolved(config) {
      policy = contentSecurityPolicy(config.env)
    },
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
    },
  }
}

// In development the SPA and the backend are on different ports; the dev
// server proxies the backend's paths so the SPA still calls its own origin and
// the session cookie works. ASCENDA_API overrides the backend address.
const backend = process.env.ASCENDA_API || 'http://localhost:8080'
const devProxy = Object.fromEntries(['/api', '/bff', '/auth'].map(p => [p, { target: backend }]))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), cspMeta()],
  define: {
    __APP_BUILD__: JSON.stringify(appBuild),
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: devProxy,
  },
  // `vite preview` would inherit the dev proxy; the e2e suite runs against it
  // with every backend call mocked, so it gets none.
  preview: {
    proxy: {},
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
      // Floors for `vitest run --coverage` (CI): the measured totals, rounded
      // down, when they were last raised. Raise them as coverage climbs; never
      // lower them to get a pull request green.
      thresholds: {
        statements: 43,
        branches: 30,
        functions: 34,
        lines: 44,
      },
    },
  },
})
