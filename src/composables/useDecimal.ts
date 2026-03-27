import Decimal from 'decimal.js'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useDisplayUnitStore } from '@/stores/displayUnit'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function useDecimal() {
  function parse(value: string | number | undefined | null): Decimal {
    if (value === undefined || value === null || value === '') return new Decimal(0)
    return new Decimal(value)
  }

  function formatCurrency(value: string | number | Decimal, decimals = 2): string {
    const d = value instanceof Decimal ? value : parse(String(value))
    const locale = getLocale()
    return d.toNumber().toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  function formatPercent(value: string | number | Decimal, decimals = 1): string {
    const d = value instanceof Decimal ? value : parse(String(value))
    const pct = d.mul(100)
    const locale = getLocale()
    return pct.toNumber().toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + '\u00A0%'
  }

  /** Legacy helper — divides by 1000 regardless of selected unit.
   *  New code should use formatUnit() instead. */
  function formatK(value: string | number | Decimal, decimals = 1): string {
    const d = value instanceof Decimal ? value : parse(String(value))
    const k = d.div(1000)
    return formatCurrency(k, decimals)
  }

  /**
   * Format a base-€ monetary amount using the user-selected display unit
   * (€ / k€ / M€).  Always divides by the current unit factor before
   * rendering, so all callers should pass raw base-€ values.
   */
  function formatUnit(value: string | number | Decimal, overrideDecimals?: number): string {
    const d = value instanceof Decimal ? value : parse(String(value))
    try {
      const displayUnit = useDisplayUnitStore()
      const scaled = d.div(displayUnit.factor)
      const dec = overrideDecimals ?? displayUnit.decimals
      return formatCurrency(scaled, dec)
    } catch {
      // Fallback: divide by 1000 (k€)
      return formatCurrency(d.div(1000), overrideDecimals ?? 1)
    }
  }

  function getLocale(): string {
    try {
      const settings = useSettingsStore()
      return settings.config?.language === 'en' ? 'en-US' : 'fr-FR'
    } catch {
      return 'en-US'
    }
  }

  /** Returns the currently selected display unit label (e.g. "k€"). */
  function getUnitLabel(): string {
    try {
      const displayUnit = useDisplayUnitStore()
      return displayUnit.unit
    } catch {
      return 'k€'
    }
  }

  return { parse, formatCurrency, formatPercent, formatK, formatUnit, getLocale, getUnitLabel }
}
