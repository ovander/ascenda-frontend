/**
 * i18nHelper.ts
 * ─────────────
 * Provides a real vue-i18n instance for Vitest component tests so that
 * `t('some.key')` returns the actual translation string instead of the mock
 * `$t: (key) => key` stub in setup.ts.
 *
 * Usage
 * -----
 * ```ts
 * import { createTestI18n, mountWithI18n } from '@/test/i18nHelper'
 * import { mount } from '@vue/test-utils'
 *
 * // Option A — mount with i18n installed:
 * const wrapper = mountWithI18n(MyComponent, { props: { ... } })
 *
 * // Option B — install into an existing mount config:
 * const wrapper = mount(MyComponent, {
 *   global: { plugins: [createTestI18n('en')] },
 * })
 *
 * // Option C — change locale mid-test:
 * const i18n = createTestI18n('fr')
 * const wrapper = mount(MyComponent, { global: { plugins: [i18n] } })
 * i18n.global.locale.value = 'en'
 * await nextTick()
 * ```
 */

import { createI18n } from 'vue-i18n'
import { mount, type MountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import fr from '@/locales/fr.json'
import en from '@/locales/en.json'

export type SupportedLocale = 'fr' | 'en'

/**
 * Creates a Composition-API i18n instance pre-loaded with both locales.
 * Defaults to French (matching the app's default runtime locale).
 */
export function createTestI18n(locale: SupportedLocale = 'fr') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { fr, en },
  })
}

/**
 * Mounts a component with a real i18n instance already installed as a plugin.
 * Merges `options.global.plugins` if provided.
 */
export function mountWithI18n<T>(
  component: Component,
  options: MountingOptions<T> & { locale?: SupportedLocale } = {},
) {
  const { locale = 'fr', ...rest } = options
  const i18n = createTestI18n(locale)

  return mount(component as any, {
    ...rest,
    global: {
      ...rest.global,
      plugins: [i18n, ...(rest.global?.plugins ?? [])],
    },
  })
}

// ── Key-presence sanity helpers ───────────────────────────────────────────────

/**
 * Returns true when every key in `keys` is present and non-empty
 * in both the fr and en message catalogs.
 *
 * Supports dot-notation: `assertKeysExist(['nav.pnl', 'pnl.row.ebitda'])`
 */
export function assertTranslationKeysExist(keys: string[]): void {
  const catalogs: Record<string, any> = { fr, en }

  for (const locale of ['fr', 'en'] as const) {
    const catalog = catalogs[locale]
    for (const key of keys) {
      const parts = key.split('.')
      let node: any = catalog
      for (const part of parts) {
        if (node == null || typeof node !== 'object') {
          throw new Error(`[i18n test] Missing key "${key}" in locale "${locale}" (stopped at "${part}")`)
        }
        node = node[part]
      }
      if (node === undefined || node === null || node === '') {
        throw new Error(`[i18n test] Empty value for key "${key}" in locale "${locale}"`)
      }
    }
  }
}
