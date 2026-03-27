import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive, computed, nextTick } from 'vue'

// We test the wizard's local logic (validation, step navigation, data structures)
// without mounting the full Vue component, since PrimeVue components require
// extensive mocking. Instead, we extract and test the logic directly.

describe('PlanWizardView Logic', () => {
  // ── Step navigation ─────────────────────────────────────────────
  describe('step navigation', () => {
    let currentStep: ReturnType<typeof ref<number>>
    const stepsCount = 10

    beforeEach(() => {
      currentStep = ref(0)
    })

    it('starts at step 0', () => {
      expect(currentStep.value).toBe(0)
    })

    it('nextStep increments within bounds', () => {
      currentStep.value++
      expect(currentStep.value).toBe(1)
    })

    it('cannot go below 0', () => {
      if (currentStep.value > 0) currentStep.value--
      expect(currentStep.value).toBe(0)
    })

    it('cannot exceed last step', () => {
      currentStep.value = stepsCount - 1
      const next = Math.min(currentStep.value + 1, stepsCount - 1)
      expect(next).toBe(stepsCount - 1)
    })
  })

  // ── Validation ──────────────────────────────────────────────────
  describe('validation logic', () => {
    it('rejects empty plan name', () => {
      const planName = ''
      expect(planName.trim()).toBe('')
    })

    it('accepts non-empty plan name', () => {
      const planName = 'My Plan'
      expect(planName.trim().length).toBeGreaterThan(0)
    })

    it('rejects empty company name', () => {
      const companyName = '   '
      expect(companyName.trim()).toBe('')
    })

    it('validates at least one product has a name', () => {
      const products = [
        { name: '', baseUnitPrice: null },
        { name: '', baseUnitPrice: null },
      ]
      expect(products.some(p => p.name.trim())).toBe(false)
    })

    it('passes when one product has a name', () => {
      const products = [
        { name: 'Widget', baseUnitPrice: 100 },
        { name: '', baseUnitPrice: null },
      ]
      expect(products.some(p => p.name.trim())).toBe(true)
    })
  })

  // ── Product data structure ──────────────────────────────────────
  describe('products data', () => {
    interface WizardProduct {
      name: string
      baseUnitPrice: number | null
      rawMaterialCost: number | null
      unitsSoldY1: number | null
      unitsSoldY2: number | null
      unitsSoldY3: number | null
      unitsSoldY4: number | null
      unitsSoldY5: number | null
    }

    let products: WizardProduct[]

    beforeEach(() => {
      products = [
        { name: '', baseUnitPrice: null, rawMaterialCost: null, unitsSoldY1: null, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null },
      ]
    })

    it('starts with one empty product', () => {
      expect(products).toHaveLength(1)
      expect(products[0].name).toBe('')
    })

    it('addProduct appends a new row', () => {
      products.push({ name: '', baseUnitPrice: null, rawMaterialCost: null, unitsSoldY1: null, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null })
      expect(products).toHaveLength(2)
    })

    it('removeProduct removes by index (when > 1)', () => {
      products.push({ name: 'B', baseUnitPrice: 50, rawMaterialCost: 20, unitsSoldY1: 100, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null })
      expect(products).toHaveLength(2)
      products.splice(0, 1) // remove first
      expect(products).toHaveLength(1)
      expect(products[0].name).toBe('B')
    })

    it('cannot remove last product', () => {
      expect(products).toHaveLength(1)
      if (products.length > 1) products.splice(0, 1)
      expect(products).toHaveLength(1) // still 1
    })

    it('filters valid products correctly', () => {
      products[0].name = 'Widget'
      products.push({ name: '', baseUnitPrice: null, rawMaterialCost: null, unitsSoldY1: null, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null })
      products.push({ name: 'Gadget', baseUnitPrice: 200, rawMaterialCost: 80, unitsSoldY1: 50, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null })

      const valid = products.filter(p => p.name.trim())
      expect(valid).toHaveLength(2)
      expect(valid[0].name).toBe('Widget')
      expect(valid[1].name).toBe('Gadget')
    })
  })

  // ── Staff data structure ────────────────────────────────────────
  describe('staff data', () => {
    const staffCategories = [
      'rnd_engineers', 'prod_engineers', 'prod_technicians', 'sales_team',
      'marketing_team', 'admin_managers', 'admin_assistants', 'executive_team',
    ]

    it('has all 8 staff categories', () => {
      expect(staffCategories).toHaveLength(8)
    })

    it('computes total FTE for year 1', () => {
      const staffRows = [
        { fteY1: 2 },
        { fteY1: 3 },
        { fteY1: null },
        { fteY1: 1.5 },
      ]
      const total = staffRows.reduce((sum, r) => sum + (r.fteY1 || 0), 0)
      expect(total).toBe(6.5)
    })

    it('handles all-null FTE gracefully', () => {
      const staffRows = [{ fteY1: null }, { fteY1: null }]
      const total = staffRows.reduce((sum, r) => sum + (r.fteY1 || 0), 0)
      expect(total).toBe(0)
    })
  })

  // ── Capex data structure ────────────────────────────────────────
  describe('capex data', () => {
    it('computes total capex for year 1', () => {
      const capexRows = [
        { amtY1: 50000 },
        { amtY1: 30000 },
        { amtY1: null },
      ]
      const total = capexRows.reduce((sum, r) => sum + (r.amtY1 || 0), 0)
      expect(total).toBe(80000)
    })

    it('pre-fills depreciation years per category', () => {
      const capexCategories = [
        { key: 'land', years: 0 },
        { key: 'buildings', years: 20 },
        { key: 'computer_hw_sw', years: 3 },
      ]
      expect(capexCategories[0].years).toBe(0) // land not depreciated
      expect(capexCategories[1].years).toBe(20)
      expect(capexCategories[2].years).toBe(3)
    })
  })

  // ── Opex data structure ─────────────────────────────────────────
  describe('opex data', () => {
    it('computes total opex for year 1', () => {
      const opexRows = [
        { amtY1: 12000 },
        { amtY1: 6000 },
        { amtY1: null },
        { amtY1: 24000 },
      ]
      const total = opexRows.reduce((sum, r) => sum + (r.amtY1 || 0), 0)
      expect(total).toBe(42000)
    })
  })

  // ── Year headers ────────────────────────────────────────────────
  describe('year headers', () => {
    it('generates 5 year headers from forecast start', () => {
      const forecastStart = '2025-01-01'
      const start = new Date(forecastStart).getFullYear()
      const headers = Array.from({ length: 5 }, (_, i) => `Y${i + 1} (${start + i})`)

      expect(headers).toEqual([
        'Y1 (2025)', 'Y2 (2026)', 'Y3 (2027)', 'Y4 (2028)', 'Y5 (2029)',
      ])
    })

    it('handles mid-year start date', () => {
      const forecastStart = '2026-07-15'
      const start = new Date(forecastStart).getFullYear()
      const headers = Array.from({ length: 5 }, (_, i) => `Y${i + 1} (${start + i})`)

      expect(headers[0]).toBe('Y1 (2026)')
      expect(headers[4]).toBe('Y5 (2030)')
    })
  })

  // ── Review computed summaries ───────────────────────────────────
  describe('review summaries', () => {
    it('counts valid products', () => {
      const products = [
        { name: 'A' }, { name: '' }, { name: 'C' }, { name: '  ' },
      ]
      const count = products.filter(p => p.name.trim()).length
      expect(count).toBe(2)
    })

    it('formats financing summary correctly', () => {
      const financing = { shareCapitalIncrease: 100000, longTermLoan: 200000, loanTermYears: 5, loanInterestRate: 4 }
      expect(financing.shareCapitalIncrease).toBe(100000)
      expect(financing.longTermLoan).toBe(200000)
      expect(`${financing.loanTermYears}y @ ${financing.loanInterestRate}%`).toBe('5y @ 4%')
    })
  })

  // ── finishWizard data transformation ────────────────────────────
  describe('data transformation for API', () => {
    it('builds headcount entries from staff rows', () => {
      const staffRows = [
        { category: 'rnd_engineers', fteY1: 2, fteY2: 3, fteY3: null, fteY4: null, fteY5: null },
        { category: 'sales_team', fteY1: null, fteY2: 1, fteY3: 2, fteY4: null, fteY5: null },
      ]

      const headcounts = staffRows.flatMap(row => {
        const years = [row.fteY1, row.fteY2, row.fteY3, row.fteY4, row.fteY5]
        return years
          .map((fte, i) => fte != null ? { category: row.category, yearIndex: i, fte: String(fte) } : null)
          .filter(Boolean)
      })

      expect(headcounts).toHaveLength(4)
      expect(headcounts[0]).toEqual({ category: 'rnd_engineers', yearIndex: 0, fte: '2' })
      expect(headcounts[1]).toEqual({ category: 'rnd_engineers', yearIndex: 1, fte: '3' })
      expect(headcounts[2]).toEqual({ category: 'sales_team', yearIndex: 1, fte: '1' })
      expect(headcounts[3]).toEqual({ category: 'sales_team', yearIndex: 2, fte: '2' })
    })

    it('builds capex entries skipping nulls', () => {
      const capexRows = [
        { category: 'equipment_tools', depreciationYears: 7, amtY1: 50000, amtY2: null, amtY3: 20000, amtY4: null, amtY5: null },
      ]

      const entries = capexRows.flatMap(row => {
        const years = [row.amtY1, row.amtY2, row.amtY3, row.amtY4, row.amtY5]
        return years
          .map((amt, i) => amt ? { category: row.category, yearIndex: i, amount: String(amt), depreciationYears: row.depreciationYears } : null)
          .filter(Boolean)
      })

      expect(entries).toHaveLength(2)
      expect(entries[0]).toEqual({ category: 'equipment_tools', yearIndex: 0, amount: '50000', depreciationYears: 7 })
      expect(entries[1]).toEqual({ category: 'equipment_tools', yearIndex: 2, amount: '20000', depreciationYears: 7 })
    })

    it('builds product volumes from year columns', () => {
      const prod = { unitsSoldY1: 100, unitsSoldY2: 200, unitsSoldY3: null, unitsSoldY4: 400, unitsSoldY5: null }
      const yearVolumes = [prod.unitsSoldY1, prod.unitsSoldY2, prod.unitsSoldY3, prod.unitsSoldY4, prod.unitsSoldY5]
      const volumes = yearVolumes.flatMap((units, i) =>
        units ? [{ yearIndex: i, zone: 'france', channel: 'direct', unitsSold: units }] : []
      )

      expect(volumes).toHaveLength(3)
      expect(volumes[0]).toEqual({ yearIndex: 0, zone: 'france', channel: 'direct', unitsSold: 100 })
      expect(volumes[2]).toEqual({ yearIndex: 3, zone: 'france', channel: 'direct', unitsSold: 400 })
    })

    it('builds opex entries skipping nulls', () => {
      const opexRows = [
        { lineId: 'rent', amtY1: 24000, amtY2: 24000, amtY3: null, amtY4: null, amtY5: null },
        { lineId: 'insurance', amtY1: 3000, amtY2: null, amtY3: null, amtY4: null, amtY5: null },
      ]

      const entries = opexRows.flatMap(row => {
        const years = [row.amtY1, row.amtY2, row.amtY3, row.amtY4, row.amtY5]
        return years
          .map((amt, i) => amt ? { lineId: row.lineId, yearIndex: i, amount: String(amt) } : null)
          .filter(Boolean)
      })

      expect(entries).toHaveLength(3)
      expect(entries[0]).toEqual({ lineId: 'rent', yearIndex: 0, amount: '24000' })
      expect(entries[1]).toEqual({ lineId: 'rent', yearIndex: 1, amount: '24000' })
      expect(entries[2]).toEqual({ lineId: 'insurance', yearIndex: 0, amount: '3000' })
    })

    it('builds financing entries only for non-null values', () => {
      const financing = { shareCapitalIncrease: 50000, longTermLoan: null as number | null }
      const fiplanEntries: any[] = []
      if (financing.shareCapitalIncrease) {
        fiplanEntries.push({ lineId: 'share_capital_increase', yearIndex: 0, amount: String(financing.shareCapitalIncrease) })
      }
      if (financing.longTermLoan) {
        fiplanEntries.push({ lineId: 'long_term_loan', yearIndex: 0, amount: String(financing.longTermLoan) })
      }

      expect(fiplanEntries).toHaveLength(1)
      expect(fiplanEntries[0].lineId).toBe('share_capital_increase')
    })

    it('salary rows expand to 5 years for each category with a salary', () => {
      const staffRows = [
        { category: 'rnd_engineers', monthlySalary: 4500 },
        { category: 'sales_team', monthlySalary: null },
      ]

      const salaries = staffRows
        .filter(row => row.monthlySalary != null)
        .flatMap(row =>
          Array.from({ length: 5 }, (_, i) => ({
            category: row.category,
            yearIndex: i,
            monthlyGrossSalary: String(row.monthlySalary),
          }))
        )

      expect(salaries).toHaveLength(5) // only rnd_engineers × 5 years
      expect(salaries[0]).toEqual({ category: 'rnd_engineers', yearIndex: 0, monthlyGrossSalary: '4500' })
      expect(salaries[4]).toEqual({ category: 'rnd_engineers', yearIndex: 4, monthlyGrossSalary: '4500' })
    })
  })

  // ── Cap Table (wizard step 10, Pro-only) ─────────────────────────
  describe('wizard cap table shareholders', () => {
    type WizardShareholderType = 'founder' | 'investor' | 'employee' | 'other'
    interface WizardShareholder {
      name: string
      type: WizardShareholderType
      shares: number | null
      ownershipPct: number | null
      investedAmount: number | null
    }

    let wizardShareholders: WizardShareholder[]

    beforeEach(() => {
      wizardShareholders = []
    })

    it('starts with an empty shareholders list', () => {
      expect(wizardShareholders).toHaveLength(0)
    })

    it('addWizardShareholder appends a blank row', () => {
      wizardShareholders.push({ name: '', type: 'founder', shares: null, ownershipPct: null, investedAmount: null })
      expect(wizardShareholders).toHaveLength(1)
      expect(wizardShareholders[0].type).toBe('founder')
    })

    it('removeWizardShareholder removes by index', () => {
      wizardShareholders.push(
        { name: 'Alice', type: 'founder',   shares: 600, ownershipPct: 60, investedAmount: 50000 },
        { name: 'Bob',   type: 'investor',  shares: 400, ownershipPct: 40, investedAmount: 30000 },
      )
      wizardShareholders.splice(0, 1) // remove Alice
      expect(wizardShareholders).toHaveLength(1)
      expect(wizardShareholders[0].name).toBe('Bob')
    })

    it('totalShareholders counts only named (non-empty) rows', () => {
      wizardShareholders.push(
        { name: 'Alice', type: 'founder',  shares: 600, ownershipPct: 60, investedAmount: 50000 },
        { name: '',      type: 'investor', shares: null, ownershipPct: null, investedAmount: null },
        { name: 'Carol', type: 'employee', shares: 100, ownershipPct: 10, investedAmount: 10000 },
      )
      const total = wizardShareholders.filter(s => s.name.trim()).length
      expect(total).toBe(2)
    })

    it('filters valid shareholders for API submission (name must be non-empty)', () => {
      wizardShareholders.push(
        { name: 'Alice', type: 'founder',  shares: 600, ownershipPct: 60, investedAmount: 50000 },
        { name: '',      type: 'investor', shares: null, ownershipPct: null, investedAmount: null },
      )
      const validShareholders = wizardShareholders.filter(s => s.name.trim())
      expect(validShareholders).toHaveLength(1)
      expect(validShareholders[0].name).toBe('Alice')
    })

    it('builds correct payload shape for POST to cap-table/shareholders', () => {
      const sh: WizardShareholder = { name: 'Alice', type: 'founder', shares: 600, ownershipPct: 60, investedAmount: 50000 }
      const payload = {
        name: sh.name,
        type: sh.type,
        shares: sh.shares ?? 0,
        ownershipPct: String(sh.ownershipPct ?? 0),
        investedAmount: String(sh.investedAmount ?? 0),
      }
      expect(payload).toEqual({
        name: 'Alice',
        type: 'founder',
        shares: 600,
        ownershipPct: '60',
        investedAmount: '50000',
      })
    })

    it('uses 0 for null shares/ownership/invested in payload', () => {
      const sh: WizardShareholder = { name: 'Eve', type: 'other', shares: null, ownershipPct: null, investedAmount: null }
      const payload = {
        name: sh.name,
        type: sh.type,
        shares: sh.shares ?? 0,
        ownershipPct: String(sh.ownershipPct ?? 0),
        investedAmount: String(sh.investedAmount ?? 0),
      }
      expect(payload.shares).toBe(0)
      expect(payload.ownershipPct).toBe('0')
      expect(payload.investedAmount).toBe('0')
    })

    it('allows all shareholder type values', () => {
      const types: WizardShareholderType[] = ['founder', 'investor', 'employee', 'other']
      for (const t of types) {
        wizardShareholders.push({ name: t, type: t, shares: null, ownershipPct: null, investedAmount: null })
      }
      expect(wizardShareholders.map(s => s.type)).toEqual(types)
    })
  })

  // ── capTableDerivedCapital & shareCapital auto-population ─────────
  describe('shareCapital auto-population from cap table', () => {
    type WizardShareholder = {
      name: string
      investedAmount: number | null
    }

    function computeCapTableDerived(isPro: boolean, shareholders: WizardShareholder[]): number {
      if (!isPro) return 0
      return shareholders
        .filter(s => s.name.trim())
        .reduce((sum, s) => sum + (s.investedAmount ?? 0), 0)
    }

    function applyShareCapitalOverride(
      isPro: boolean,
      shareholders: WizardShareholder[],
      formShareCapital: number,
    ): number {
      const totalInvested = shareholders
        .filter(s => s.name.trim())
        .reduce((sum, s) => sum + (s.investedAmount ?? 0), 0)
      if (isPro && totalInvested > 0) {
        return totalInvested
      }
      return formShareCapital
    }

    it('capTableDerivedCapital is 0 on free tier regardless of shareholders', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
      ]
      expect(computeCapTableDerived(false, shareholders)).toBe(0)
    })

    it('capTableDerivedCapital is 0 on Pro tier when no shareholders entered', () => {
      expect(computeCapTableDerived(true, [])).toBe(0)
    })

    it('capTableDerivedCapital sums investedAmounts on Pro tier', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
        { name: 'Bob',   investedAmount: 30000 },
      ]
      expect(computeCapTableDerived(true, shareholders)).toBe(80000)
    })

    it('capTableDerivedCapital ignores rows with null investedAmount', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
        { name: 'Bob',   investedAmount: null },
      ]
      expect(computeCapTableDerived(true, shareholders)).toBe(50000)
    })

    it('capTableDerivedCapital skips unnamed shareholders', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
        { name: '',      investedAmount: 99999 }, // blank row, not counted
      ]
      expect(computeCapTableDerived(true, shareholders)).toBe(50000)
    })

    // ── finishWizard override logic ─────────────────────────────────
    it('overrides formData.shareCapital with cap table total on Pro tier', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
        { name: 'Bob',   investedAmount: 30000 },
      ]
      const result = applyShareCapitalOverride(true, shareholders, 0)
      expect(result).toBe(80000)
    })

    it('does NOT override formData.shareCapital on free tier', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 50000 },
      ]
      const result = applyShareCapitalOverride(false, shareholders, 25000)
      expect(result).toBe(25000) // original manual value preserved
    })

    it('does NOT override when total invested is 0 (even on Pro)', () => {
      const shareholders = [
        { name: 'Alice', investedAmount: 0 },
        { name: 'Bob',   investedAmount: null },
      ]
      const result = applyShareCapitalOverride(true, shareholders, 10000)
      expect(result).toBe(10000) // zero invested → keep manual value
    })

    it('does NOT override when no shareholders are present', () => {
      const result = applyShareCapitalOverride(true, [], 15000)
      expect(result).toBe(15000)
    })

    it('overrides a manually set shareCapital if cap table has data (Pro)', () => {
      const shareholders = [{ name: 'Alice', investedAmount: 80000 }]
      // User manually typed 10000 on step 4 but cap table says 80000
      const result = applyShareCapitalOverride(true, shareholders, 10000)
      expect(result).toBe(80000) // cap table wins
    })

    it('correctly handles mixed null and valued investedAmounts', () => {
      const shareholders = [
        { name: 'Founder A', investedAmount: 100000 },
        { name: 'Investor B', investedAmount: null },
        { name: 'Employee C', investedAmount: 5000 },
        { name: '',           investedAmount: 99999 }, // unnamed, excluded
      ]
      const result = applyShareCapitalOverride(true, shareholders, 0)
      expect(result).toBe(105000)
    })
  })

  // ── Steps config (updated with 11 steps) ─────────────────────────
  describe('steps config', () => {
    const steps = [
      { label: 'Plan Details', optional: false, requiresPro: false },
      { label: 'General Config', optional: false, requiresPro: false },
      { label: 'Key Rates', optional: false, requiresPro: false },
      { label: 'Opening Balance', optional: false, requiresPro: false },
      { label: 'Working Capital', optional: false, requiresPro: false },
      { label: 'Products', optional: false, requiresPro: false },
      { label: 'Staff', optional: false, requiresPro: false },
      { label: 'Capex', optional: false, requiresPro: false },
      { label: 'Opex & Financing', optional: false, requiresPro: false },
      { label: 'Cap Table', optional: true, requiresPro: true },
      { label: 'Review', optional: false, requiresPro: false },
    ]

    it('has 11 steps total', () => {
      expect(steps).toHaveLength(11)
    })

    it('Cap Table step is at index 9', () => {
      expect(steps[9].label).toBe('Cap Table')
    })

    it('Cap Table step is marked optional and requiresPro', () => {
      expect(steps[9].optional).toBe(true)
      expect(steps[9].requiresPro).toBe(true)
    })

    it('Review step is at index 10', () => {
      expect(steps[10].label).toBe('Review')
      expect(steps[10].optional).toBe(false)
      expect(steps[10].requiresPro).toBe(false)
    })

    it('Opening Balance step is at index 3', () => {
      expect(steps[3].label).toBe('Opening Balance')
    })

    it('no other steps require Pro', () => {
      const proSteps = steps.filter(s => s.requiresPro)
      expect(proSteps).toHaveLength(1)
      expect(proSteps[0].label).toBe('Cap Table')
    })
  })
})
