/**
 * useDecimal.unit-scaling.spec.ts
 *
 * Layer 1 of the systematic unit-multiple test suite.
 *
 * These tests assert EXACT rendered strings (not just truthiness) for
 * `formatUnit()` across all three display modes (€ / k€ / M€).  They serve as
 * the foundation contract: if any of these fail, every module grid in the
 * application is showing wrong numbers.
 *
 * Test matrix
 * ───────────
 * Input value (base €) │  €        │ k€        │ M€
 * ─────────────────────┼───────────┼───────────┼──────────
 *            1         │  1        │  0.0      │  0.00
 *         1 000        │  1,000    │  1.0      │  0.00
 *         1 500        │  1,500    │  1.5      │  0.00
 *     1 000 000        │ 1,000,000 │ 1,000.0   │  1.00
 *     2 500 000        │ 2,500,000 │ 2,500.0   │  2.50
 *   100 000 000        │         … │100,000.0  │  100.00
 *            0         │  0        │  0.0      │  0.00
 *           -500 000   │ -500,000  │ -500.0    │ -0.50
 *
 * Note: exact string format depends on locale.  Tests use en-US so they
 * produce predictable separators (comma = thousands, dot = decimal).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDecimal } from './useDecimal'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useDisplayUnitStore } from '@/stores/displayUnit'

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(),
}))
vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a mock displayUnitStore for the given unit */
function makeDisplayUnit(unit: '€' | 'k€' | 'M€') {
  const factors = { '€': 1, 'k€': 1_000, 'M€': 1_000_000 }
  const decimalsByUnit = { '€': 0, 'k€': 1, 'M€': 2 }
  return { unit, factor: factors[unit], decimals: decimalsByUnit[unit] }
}

function setupMocks(unit: '€' | 'k€' | 'M€', language: 'en' | 'fr' = 'en') {
  vi.mocked(useSettingsStore).mockReturnValue({ config: { language } } as any)
  vi.mocked(useDisplayUnitStore).mockReturnValue(makeDisplayUnit(unit) as any)
}

// ── Layer 1: exact-value assertions for formatUnit ────────────────────────────

describe('useDecimal.formatUnit — € display (factor = 1)', () => {
  beforeEach(() => setupMocks('€'))

  it('1 → "1"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1)).toBe('1')
  })

  it('1_000 → "1,000"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000)).toBe('1,000')
  })

  it('1_500 → "1,500"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_500)).toBe('1,500')
  })

  it('1_000_000 → "1,000,000"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000_000)).toBe('1,000,000')
  })

  it('0 → "0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(0)).toBe('0')
  })

  it('-500_000 → "-500,000"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(-500_000)).toBe('-500,000')
  })

  it('string input "2500000" → "2,500,000"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit('2500000')).toBe('2,500,000')
  })

  it('overrideDecimals=2 → forces 2 decimal places', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000, 2)).toBe('1,000.00')
  })
})

describe('useDecimal.formatUnit — k€ display (factor = 1 000)', () => {
  beforeEach(() => setupMocks('k€'))

  it('1 → "0.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1)).toBe('0.0')
  })

  it('1_000 → "1.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000)).toBe('1.0')
  })

  it('1_500 → "1.5"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_500)).toBe('1.5')
  })

  it('500_000 → "500.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(500_000)).toBe('500.0')
  })

  it('1_000_000 → "1,000.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000_000)).toBe('1,000.0')
  })

  it('2_500_000 → "2,500.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(2_500_000)).toBe('2,500.0')
  })

  it('0 → "0.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(0)).toBe('0.0')
  })

  it('-500_000 → "-500.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(-500_000)).toBe('-500.0')
  })

  it('string input "1000000" → "1,000.0"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit('1000000')).toBe('1,000.0')
  })

  it('overrideDecimals=0 → no decimal places', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_500_000, 0)).toBe('1,500')
  })
})

describe('useDecimal.formatUnit — M€ display (factor = 1 000 000)', () => {
  beforeEach(() => setupMocks('M€'))

  it('1 → "0.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1)).toBe('0.00')
  })

  it('1_000 → "0.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000)).toBe('0.00')
  })

  it('1_000_000 → "1.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(1_000_000)).toBe('1.00')
  })

  it('2_500_000 → "2.50"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(2_500_000)).toBe('2.50')
  })

  it('100_000_000 → "100.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(100_000_000)).toBe('100.00')
  })

  it('0 → "0.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(0)).toBe('0.00')
  })

  it('-2_500_000 → "-2.50"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(-2_500_000)).toBe('-2.50')
  })

  it('string input "5000000" → "5.00"', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit('5000000')).toBe('5.00')
  })

  it('overrideDecimals=1 → forces 1 decimal place', () => {
    const { formatUnit } = useDecimal()
    expect(formatUnit(2_500_000, 1)).toBe('2.5')
  })
})

describe('useDecimal.formatUnit — unit switching consistency', () => {
  it('same base value renders proportionally across units', () => {
    // 1,200,000 base € should read as:
    //   € → 1,200,000   (factor 1)
    //  k€ →     1,200.0 (factor 1000)
    //  M€ →         1.20 (factor 1,000,000)
    const BASE = 1_200_000

    setupMocks('€')
    const { formatUnit: fe } = useDecimal()
    expect(fe(BASE)).toBe('1,200,000')

    setupMocks('k€')
    const { formatUnit: fk } = useDecimal()
    expect(fk(BASE)).toBe('1,200.0')

    setupMocks('M€')
    const { formatUnit: fm } = useDecimal()
    expect(fm(BASE)).toBe('1.20')
  })

  it('zero displays as zero in all units', () => {
    for (const unit of ['€', 'k€', 'M€'] as const) {
      setupMocks(unit)
      const { formatUnit } = useDecimal()
      const result = formatUnit(0)
      expect(result).toMatch(/^0/)  // starts with 0
    }
  })

  it('formatUnit falls back to k€ (÷1000) when store throws', () => {
    vi.mocked(useDisplayUnitStore).mockImplementation(() => { throw new Error('store unavailable') })
    vi.mocked(useSettingsStore).mockReturnValue({ config: { language: 'en' } } as any)

    const { formatUnit } = useDecimal()
    // Fallback path: divide by 1000, 1 decimal
    expect(formatUnit(1_000_000)).toBe('1,000.0')
  })
})

describe('useDecimal.formatUnit — French locale (fr-FR)', () => {
  // In fr-FR: thousands separator = narrow-no-break space or regular space,
  // decimal separator = comma.  We test the sign and magnitude, not the
  // exact separator character (which varies by Node version).

  beforeEach(() => setupMocks('k€', 'fr'))

  it('1_000_000 in k€ produces "1 000" range (French locale)', () => {
    const { formatUnit } = useDecimal()
    const result = formatUnit(1_000_000)
    // The numeric value should be 1000.0 regardless of separator
    const numeric = parseFloat(result.replace(/\s/g, '').replace(',', '.'))
    expect(numeric).toBeCloseTo(1000, 0)
  })

  it('negative values preserve sign in fr-FR', () => {
    const { formatUnit } = useDecimal()
    const result = formatUnit(-500_000)
    expect(result).toContain('-')
    const numeric = parseFloat(result.replace(/\s/g, '').replace(',', '.'))
    expect(numeric).toBeCloseTo(-500, 0)
  })
})

describe('useDecimal.getUnitLabel — returns correct label per unit', () => {
  it.each([
    ['€',  '€'],
    ['k€', 'k€'],
    ['M€', 'M€'],
  ] as ['€' | 'k€' | 'M€', string][])('unit=%s → label=%s', (unit, expected) => {
    setupMocks(unit)
    const { getUnitLabel } = useDecimal()
    expect(getUnitLabel()).toBe(expected)
  })
})
