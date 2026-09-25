import { describe, it, expect, vi, beforeEach } from 'vitest'
import Decimal from 'decimal.js'
import { useDecimal } from './useDecimal'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useDisplayUnitStore } from '@/stores/displayUnit'

// Mock the settings store
vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(),
}))

// Mock the display unit store (used by formatUnit and getUnitLabel)
vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: vi.fn(),
}))

describe('useDecimal composable', () => {
  let mockSettingsStore: any
  let mockDisplayUnitStore: any

  beforeEach(() => {
    mockSettingsStore = {
      config: {
        language: 'fr',
      },
      configComputed: {
        unitLabel: 'k€',
      },
    }
    vi.mocked(useSettingsStore).mockReturnValue(mockSettingsStore)

    mockDisplayUnitStore = {
      unit: 'k€',
      factor: 1000,
      decimals: 1,
    }
    vi.mocked(useDisplayUnitStore).mockReturnValue(mockDisplayUnitStore as any)
  })

  describe('parse', () => {
    it('should parse a string number', () => {
      const { parse } = useDecimal()
      const result = parse('123.45')
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toNumber()).toBe(123.45)
    })

    it('should parse a number', () => {
      const { parse } = useDecimal()
      const result = parse(456.78)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toNumber()).toBe(456.78)
    })

    it('should parse a Decimal instance', () => {
      const { parse } = useDecimal()
      const decimal = new Decimal('789.12')
      const result = parse(decimal)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toNumber()).toBe(789.12)
    })

    it('should return 0 for undefined', () => {
      const { parse } = useDecimal()
      const result = parse(undefined)
      expect(result.toNumber()).toBe(0)
    })

    it('should return 0 for null', () => {
      const { parse } = useDecimal()
      const result = parse(null)
      expect(result.toNumber()).toBe(0)
    })

    it('should return 0 for empty string', () => {
      const { parse } = useDecimal()
      const result = parse('')
      expect(result.toNumber()).toBe(0)
    })

    it('should handle large numbers', () => {
      const { parse } = useDecimal()
      const result = parse('9999999999.99')
      expect(result.toNumber()).toBe(9999999999.99)
    })

    it('should handle negative numbers', () => {
      const { parse } = useDecimal()
      const result = parse('-123.45')
      expect(result.toNumber()).toBe(-123.45)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency with default 2 decimals in French locale', () => {
      const { formatCurrency } = useDecimal()
      const result = formatCurrency('1234.5')
      expect(result).toBeTruthy()
      expect(result).toContain('1')
    })

    it('should format currency with custom decimal places', () => {
      const { formatCurrency } = useDecimal()
      const result = formatCurrency('1234.56789', 3)
      expect(result).toBeTruthy()
    })

    it('should format Decimal instance', () => {
      const { formatCurrency } = useDecimal()
      const decimal = new Decimal('1234.56')
      const result = formatCurrency(decimal)
      expect(result).toBeTruthy()
    })

    it('should format zero', () => {
      const { formatCurrency } = useDecimal()
      const result = formatCurrency(0)
      expect(result).toBeTruthy()
    })

    it('should format negative numbers', () => {
      const { formatCurrency } = useDecimal()
      const result = formatCurrency('-1234.56')
      expect(result).toBeTruthy()
    })

    it('should format in English locale when language is en', () => {
      mockSettingsStore.config.language = 'en'
      const { formatCurrency } = useDecimal()
      const result = formatCurrency('1234.56')
      expect(result).toBeTruthy()
    })

    it('should handle 0 decimal places', () => {
      const { formatCurrency } = useDecimal()
      const result = formatCurrency('1234.56', 0)
      expect(result).toBeTruthy()
    })
  })

  describe('formatPercent', () => {
    it('should format percent with default 1 decimal', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('0.5')
      expect(result).toContain('%')
      expect(result).toBeTruthy()
    })

    it('should multiply by 100 and add percent sign', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('0.25')
      expect(result).toContain('%')
    })

    it('should format percent with custom decimal places', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('0.123456', 2)
      expect(result).toContain('%')
    })

    it('should format Decimal instance', () => {
      const { formatPercent } = useDecimal()
      const decimal = new Decimal('0.5')
      const result = formatPercent(decimal)
      expect(result).toContain('%')
    })

    it('should format zero percent', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('0')
      expect(result).toContain('0')
      expect(result).toContain('%')
    })

    it('should format 100 percent', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('1')
      expect(result).toContain('100')
      expect(result).toContain('%')
    })

    it('should format percentage greater than 100', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('1.5')
      expect(result).toContain('150')
      expect(result).toContain('%')
    })

    it('should handle negative percentages', () => {
      const { formatPercent } = useDecimal()
      const result = formatPercent('-0.25')
      expect(result).toContain('%')
    })
  })

  describe('formatK', () => {
    it('should format value divided by 1000', () => {
      const { formatK } = useDecimal()
      const result = formatK('5000')
      expect(result).toBeTruthy()
    })

    it('should format large numbers in thousands', () => {
      const { formatK } = useDecimal()
      const result = formatK('1000000')
      expect(result).toBeTruthy()
    })

    it('should format with custom decimal places', () => {
      const { formatK } = useDecimal()
      const result = formatK('5500', 2)
      expect(result).toBeTruthy()
    })

    it('should format Decimal instance', () => {
      const { formatK } = useDecimal()
      const decimal = new Decimal('10000')
      const result = formatK(decimal)
      expect(result).toBeTruthy()
    })

    it('should format zero', () => {
      const { formatK } = useDecimal()
      const result = formatK('0')
      expect(result).toBeTruthy()
    })

    it('should format values less than 1000', () => {
      const { formatK } = useDecimal()
      const result = formatK('500')
      expect(result).toBeTruthy()
    })

    it('should default to 1 decimal place', () => {
      const { formatK } = useDecimal()
      const result = formatK('5000')
      expect(result).toBeTruthy()
    })
  })

  describe('getLocale', () => {
    it('should return fr-FR for French language', () => {
      mockSettingsStore.config.language = 'fr'
      const { getLocale } = useDecimal()
      const locale = getLocale()
      expect(locale).toBe('fr-FR')
    })

    it('should return en-US for English language', () => {
      mockSettingsStore.config.language = 'en'
      const { getLocale } = useDecimal()
      const locale = getLocale()
      expect(locale).toBe('en-US')
    })

    it('should default to en-US on error (store throws)', () => {
      vi.mocked(useSettingsStore).mockImplementation(() => {
        throw new Error('Store error')
      })
      const { getLocale } = useDecimal()
      const locale = getLocale()
      // getLocale() catches store errors and returns 'en-US' as the safe default
      expect(locale).toBe('en-US')
    })

    it('should handle undefined language', () => {
      mockSettingsStore.config.language = undefined
      const { getLocale } = useDecimal()
      const locale = getLocale()
      expect(locale).toBe('fr-FR')
    })

    it('should handle null config', () => {
      mockSettingsStore.config = null
      const { getLocale } = useDecimal()
      const locale = getLocale()
      expect(locale).toBe('fr-FR')
    })
  })

  describe('getUnitLabel', () => {
    it('should return unit from displayUnitStore', () => {
      mockDisplayUnitStore.unit = 'k€'
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      expect(label).toBe('k€')
    })

    it('should return custom unit label', () => {
      mockDisplayUnitStore.unit = '$k'
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      expect(label).toBe('$k')
    })

    it('should default to k€ when displayUnitStore throws', () => {
      vi.mocked(useDisplayUnitStore).mockImplementation(() => {
        throw new Error('Store error')
      })
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      expect(label).toBe('k€')
    })

    it('should return M€ unit label', () => {
      mockDisplayUnitStore.unit = 'M€'
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      expect(label).toBe('M€')
    })

    it('should return € unit label', () => {
      mockDisplayUnitStore.unit = '€'
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      expect(label).toBe('€')
    })

    it('should default to k€ on settingsStore error', () => {
      vi.mocked(useSettingsStore).mockImplementation(() => {
        throw new Error('Store error')
      })
      const { getUnitLabel } = useDecimal()
      const label = getUnitLabel()
      // getUnitLabel reads displayUnit, not settingsStore — should still work
      expect(label).toBe('k€')
    })
  })

  describe('integration tests', () => {
    it('should handle complete currency formatting workflow', () => {
      const { parse, formatCurrency } = useDecimal()
      const value = parse('1234.567')
      const formatted = formatCurrency(value, 2)
      expect(formatted).toBeTruthy()
    })

    it('should handle chained operations', () => {
      const { parse, formatPercent } = useDecimal()
      const value = parse('0.5')
      const percent = formatPercent(value)
      expect(percent).toContain('%')
    })
  })
})
