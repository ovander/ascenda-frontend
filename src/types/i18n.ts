/**
 * Canonical i18n locale type definitions.
 *
 * Single source of truth for supported locales. Import SupportedLocale
 * wherever a locale string is expected to get type-safety and autocomplete.
 *
 * Usage:
 *   import type { SupportedLocale } from '@/types/i18n'
 *   const lang: SupportedLocale = 'fr'
 */

export const SUPPORTED_LOCALES = ['fr', 'en'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'fr'

/**
 * Type-guard: returns true when value is a supported locale string.
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}
