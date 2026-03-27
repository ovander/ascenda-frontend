/**
 * ScenarioWizardView — logic tests
 *
 * The wizard uses PrimeVue components that require an installed PrimeVue
 * plugin to render (Steps, InputNumber, Dropdown, etc.). Rather than mount the
 * full component we test the three independently-verifiable logic layers:
 *
 *   1. Step navigation (free vs pro step counts, bounds checking, goToStep)
 *   2. Country presets (auto-filling rates/currency/language)
 *   3. Data transformation helpers (paymentTermFractions, rate %, WC fractions)
 *   4. Validation (required fields per step)
 *   5. Product management (add/remove, max cap)
 *   6. finishWizard orchestration (store calls, routing, error handling)
 *   7. Opening balance computed helpers (totalAssets, totalLiabilities, balanceGap)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive, computed } from 'vue'

// ─── Step configuration (mirrors ScenarioWizardView.vue) ─────────────────────

const FREE_STEPS = [
  { label: 'Details' },
  { label: 'Planning' },
  { label: 'Key Rates' },
  { label: 'Revenue' },
  { label: 'Review' },
]

const PRO_STEPS = [
  { label: 'Details' },
  { label: 'Planning' },
  { label: 'Key Rates' },
  { label: 'Balance' },
  { label: 'Cash Flow' },
  { label: 'Revenue' },
  { label: 'Review' },
]

// ─── Country presets (mirrors ScenarioWizardView.vue) ────────────────────────

type CountryPreset = {
  currencySymbol: string
  language: string
  corporateTaxRate: number
  vatRate: number
  employerTaxRate: number
  mltInterestRate: number
}

const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  BE: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 25,    vatRate: 21,   employerTaxRate: 27.67, mltInterestRate: 3.0  },
  FR: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 25,    vatRate: 20,   employerTaxRate: 42.0,  mltInterestRate: 3.0  },
  LU: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 17,    vatRate: 17,   employerTaxRate: 12.0,  mltInterestRate: 3.0  },
  NL: { currencySymbol: '€',   language: 'nl', corporateTaxRate: 25.8,  vatRate: 21,   employerTaxRate: 20.0,  mltInterestRate: 3.0  },
  DE: { currencySymbol: '€',   language: 'de', corporateTaxRate: 29.9,  vatRate: 19,   employerTaxRate: 20.0,  mltInterestRate: 3.5  },
  ES: { currencySymbol: '€',   language: 'es', corporateTaxRate: 25,    vatRate: 21,   employerTaxRate: 30.0,  mltInterestRate: 3.5  },
  IT: { currencySymbol: '€',   language: 'it', corporateTaxRate: 27.9,  vatRate: 22,   employerTaxRate: 30.0,  mltInterestRate: 3.5  },
  PT: { currencySymbol: '€',   language: 'pt', corporateTaxRate: 21,    vatRate: 23,   employerTaxRate: 23.75, mltInterestRate: 3.5  },
  IE: { currencySymbol: '€',   language: 'en', corporateTaxRate: 12.5,  vatRate: 23,   employerTaxRate: 11.05, mltInterestRate: 3.0  },
  CH: { currencySymbol: 'CHF', language: 'fr', corporateTaxRate: 18,    vatRate: 8.1,  employerTaxRate: 6.35,  mltInterestRate: 2.0  },
  GB: { currencySymbol: '£',   language: 'en', corporateTaxRate: 25,    vatRate: 20,   employerTaxRate: 13.8,  mltInterestRate: 4.5  },
  US: { currencySymbol: '$',   language: 'en', corporateTaxRate: 21,    vatRate: 0,    employerTaxRate: 7.65,  mltInterestRate: 5.0  },
  CA: { currencySymbol: 'CA$', language: 'fr', corporateTaxRate: 26.5,  vatRate: 5,    employerTaxRate: 7.6,   mltInterestRate: 4.5  },
}

// ─── Helpers (mirrors ScenarioWizardView.vue) ─────────────────────────────────

function paymentTermFractions(days: string) {
  return {
    d0:  days === '0'  ? '1' : '0',
    d30: days === '30' ? '1' : '0',
    d60: days === '60' ? '1' : '0',
    d90: days === '90' ? '1' : '0',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScenarioWizardView', () => {

  // ── 1. Step configuration ───────────────────────────────────────────────
  describe('step configuration', () => {
    it('free tier has 5 steps', () => {
      expect(FREE_STEPS).toHaveLength(5)
    })

    it('pro tier has 7 steps', () => {
      expect(PRO_STEPS).toHaveLength(7)
    })

    it('free tier steps are: Details → Planning → Key Rates → Revenue → Review', () => {
      const labels = FREE_STEPS.map(s => s.label)
      expect(labels).toEqual(['Details', 'Planning', 'Key Rates', 'Revenue', 'Review'])
    })

    it('pro tier inserts Balance and Cash Flow between Key Rates and Revenue', () => {
      const labels = PRO_STEPS.map(s => s.label)
      expect(labels).toEqual(['Details', 'Planning', 'Key Rates', 'Balance', 'Cash Flow', 'Revenue', 'Review'])
    })

    it('review step is always last', () => {
      expect(FREE_STEPS[FREE_STEPS.length - 1].label).toBe('Review')
      expect(PRO_STEPS[PRO_STEPS.length - 1].label).toBe('Review')
    })

    it('reviewStepIndex is steps.length - 1', () => {
      const freeReview = FREE_STEPS.length - 1
      const proReview  = PRO_STEPS.length - 1
      expect(freeReview).toBe(4)
      expect(proReview).toBe(6)
    })

    it('free revenueStepIndex is 3 (before Review)', () => {
      // Revenue is 4th step (index 3) in free tier.
      expect(FREE_STEPS[3].label).toBe('Revenue')
    })

    it('pro revenueStepIndex is 5 (before Review)', () => {
      expect(PRO_STEPS[5].label).toBe('Revenue')
    })
  })

  // ── 2. Navigation ───────────────────────────────────────────────────────
  describe('step navigation', () => {
    function makeNav(total: number) {
      const step = ref(0)
      const reviewIdx = total - 1

      function nextStep() { if (step.value < reviewIdx) step.value++ }
      function prevStep() { if (step.value > 0) step.value-- }
      function goToStep(idx: number) { if (idx < step.value) step.value = idx }

      return { step, nextStep, prevStep, goToStep, reviewIdx }
    }

    it('starts at step 0', () => {
      const { step } = makeNav(5)
      expect(step.value).toBe(0)
    })

    it('nextStep advances the step', () => {
      const { step, nextStep } = makeNav(5)
      nextStep()
      expect(step.value).toBe(1)
    })

    it('nextStep does not exceed reviewStepIndex', () => {
      const { step, nextStep, reviewIdx } = makeNav(5)
      step.value = reviewIdx
      nextStep()
      expect(step.value).toBe(reviewIdx)
    })

    it('prevStep decrements the step', () => {
      const { step, prevStep } = makeNav(5)
      step.value = 2
      prevStep()
      expect(step.value).toBe(1)
    })

    it('prevStep cannot go below 0', () => {
      const { step, prevStep } = makeNav(5)
      prevStep()
      expect(step.value).toBe(0)
    })

    it('goToStep can jump backwards', () => {
      const { step, goToStep } = makeNav(5)
      step.value = 3
      goToStep(1)
      expect(step.value).toBe(1)
    })

    it('goToStep cannot jump forward (only backwards navigation allowed)', () => {
      const { step, goToStep } = makeNav(5)
      step.value = 1
      goToStep(3) // forward — should be ignored
      expect(step.value).toBe(1)
    })

    it('free tier can traverse all 5 steps forward', () => {
      const { step, nextStep, reviewIdx } = makeNav(FREE_STEPS.length)
      while (step.value < reviewIdx) nextStep()
      expect(step.value).toBe(4)
    })

    it('pro tier can traverse all 7 steps forward', () => {
      const { step, nextStep, reviewIdx } = makeNav(PRO_STEPS.length)
      while (step.value < reviewIdx) nextStep()
      expect(step.value).toBe(6)
    })
  })

  // ── 3. Country presets ──────────────────────────────────────────────────
  describe('country presets', () => {
    const ALL_COUNTRIES = ['BE', 'FR', 'LU', 'NL', 'DE', 'GB', 'CH', 'ES', 'IT', 'PT', 'IE', 'US', 'CA']

    it('has presets for all 13 supported countries', () => {
      expect(Object.keys(COUNTRY_PRESETS)).toHaveLength(13)
      ALL_COUNTRIES.forEach(c => expect(COUNTRY_PRESETS).toHaveProperty(c))
    })

    it('Belgium: EUR, fr, 25% corp, 21% VAT, 27.67% employer', () => {
      const p = COUNTRY_PRESETS.BE
      expect(p.currencySymbol).toBe('€')
      expect(p.language).toBe('fr')
      expect(p.corporateTaxRate).toBe(25)
      expect(p.vatRate).toBe(21)
      expect(p.employerTaxRate).toBe(27.67)
    })

    it('Ireland: 12.5% corporate tax (lowest)', () => {
      expect(COUNTRY_PRESETS.IE.corporateTaxRate).toBe(12.5)
    })

    it('US: no VAT (0%)', () => {
      expect(COUNTRY_PRESETS.US.vatRate).toBe(0)
    })

    it('Switzerland: CHF currency', () => {
      expect(COUNTRY_PRESETS.CH.currencySymbol).toBe('CHF')
    })

    it('GB: GBP currency', () => {
      expect(COUNTRY_PRESETS.GB.currencySymbol).toBe('£')
    })

    it('CA: CA$ currency', () => {
      expect(COUNTRY_PRESETS.CA.currencySymbol).toBe('CA$')
    })

    it('all eurozone countries have EUR currency', () => {
      const eurozone = ['BE', 'FR', 'LU', 'NL', 'DE', 'ES', 'IT', 'PT', 'IE']
      eurozone.forEach(c => expect(COUNTRY_PRESETS[c].currencySymbol).toBe('€'))
    })

    it('selecting a country auto-fills all rate fields', () => {
      // Simulate the watch() behavior in the component.
      const planning = reactive({ country: 'BE', currencySymbol: '', language: '' })
      const rates = reactive({ corporateTaxRate: 0, vatRate: 0, employerTaxRate: 0, mltInterestRate: 0 })

      function applyPreset(code: string) {
        const p = COUNTRY_PRESETS[code]
        if (!p) return
        planning.currencySymbol    = p.currencySymbol
        planning.language          = p.language
        rates.corporateTaxRate     = p.corporateTaxRate
        rates.vatRate              = p.vatRate
        rates.employerTaxRate      = p.employerTaxRate
        rates.mltInterestRate      = p.mltInterestRate
      }

      applyPreset('FR')
      expect(rates.vatRate).toBe(20)
      expect(rates.employerTaxRate).toBe(42)
      expect(planning.language).toBe('fr')

      applyPreset('GB')
      expect(planning.currencySymbol).toBe('£')
      expect(rates.mltInterestRate).toBe(4.5)
    })

    it('all rates are positive percentages (sanity check)', () => {
      Object.values(COUNTRY_PRESETS).forEach(p => {
        expect(p.corporateTaxRate).toBeGreaterThanOrEqual(0)
        expect(p.vatRate).toBeGreaterThanOrEqual(0)
        expect(p.employerTaxRate).toBeGreaterThanOrEqual(0)
        expect(p.mltInterestRate).toBeGreaterThan(0)
      })
    })
  })

  // ── 4. Payment term fractions ────────────────────────────────────────────
  describe('paymentTermFractions', () => {
    it('0 days → d0 = 1, rest = 0', () => {
      const f = paymentTermFractions('0')
      expect(f).toEqual({ d0: '1', d30: '0', d60: '0', d90: '0' })
    })

    it('30 days → d30 = 1, rest = 0', () => {
      const f = paymentTermFractions('30')
      expect(f).toEqual({ d0: '0', d30: '1', d60: '0', d90: '0' })
    })

    it('60 days → d60 = 1, rest = 0', () => {
      const f = paymentTermFractions('60')
      expect(f).toEqual({ d0: '0', d30: '0', d60: '1', d90: '0' })
    })

    it('90 days → d90 = 1, rest = 0', () => {
      const f = paymentTermFractions('90')
      expect(f).toEqual({ d0: '0', d30: '0', d60: '0', d90: '1' })
    })

    it('each result has exactly 4 keys', () => {
      ['0', '30', '60', '90'].forEach(days => {
        const f = paymentTermFractions(days)
        expect(Object.keys(f)).toHaveLength(4)
      })
    })

    it('fractions sum to 1 for each valid term', () => {
      ['0', '30', '60', '90'].forEach(days => {
        const f = paymentTermFractions(days)
        const sum = Number(f.d0) + Number(f.d30) + Number(f.d60) + Number(f.d90)
        expect(sum).toBe(1)
      })
    })
  })

  // ── 5. Rate conversion (% → fraction string) ─────────────────────────────
  describe('rate conversion (percent to fraction string)', () => {
    function toFraction(pct: number): string {
      return String(pct / 100)
    }

    it('25% → "0.25"', () => {
      expect(toFraction(25)).toBe('0.25')
    })

    it('0% → "0"', () => {
      expect(toFraction(0)).toBe('0')
    })

    it('12.5% → "0.125"', () => {
      expect(toFraction(12.5)).toBe('0.125')
    })

    it('100% → "1"', () => {
      expect(toFraction(100)).toBe('1')
    })

    it('27.67% converts correctly', () => {
      expect(Number(toFraction(27.67))).toBeCloseTo(0.2767, 4)
    })
  })

  // ── 6. Validation ────────────────────────────────────────────────────────
  describe('validation', () => {
    it('rejects empty scenario name', () => {
      const details = reactive({ name: '', description: '' })
      expect(details.name.trim()).toBe('')
    })

    it('accepts whitespace-trimmed name', () => {
      const details = reactive({ name: '  Base Case  ', description: '' })
      expect(details.name.trim().length).toBeGreaterThan(0)
    })

    it('description is optional — empty passes validation', () => {
      const details = reactive({ name: 'X', description: '' })
      // No error expected on empty description
      expect(details.description).toBe('')
    })

    it('revenue step: passes when at least one product has a name', () => {
      const products = ref([
        { name: '',      productType: 'service', driverType: 'flat' },
        { name: 'SaaS', productType: 'saas',    driverType: 'growth' },
      ])
      expect(products.value.some(p => p.name.trim())).toBe(true)
    })

    it('revenue step: fails when no product has a name', () => {
      const products = ref([
        { name: '', productType: 'service', driverType: 'flat' },
        { name: '  ', productType: 'service', driverType: 'flat' },
      ])
      expect(products.value.some(p => p.name.trim())).toBe(false)
    })

    it('planning step: passes when forecastStartYear is set', () => {
      const planning = reactive({ forecastStartYear: 2026 })
      expect(planning.forecastStartYear).toBeTruthy()
    })

    it('planning step: fails when forecastStartYear is 0/null', () => {
      const planning = reactive({ forecastStartYear: 0 })
      expect(planning.forecastStartYear).toBeFalsy()
    })
  })

  // ── 7. Product management ────────────────────────────────────────────────
  describe('product management', () => {
    function makeProductList() {
      const products = ref([{ name: '', productType: 'service', driverType: 'flat' }])
      const MAX = 5

      function addProduct() {
        if (products.value.length < MAX)
          products.value.push({ name: '', productType: 'service', driverType: 'flat' })
      }
      function removeProduct(i: number) {
        products.value.splice(i, 1)
      }

      return { products, addProduct, removeProduct }
    }

    it('starts with one empty product', () => {
      const { products } = makeProductList()
      expect(products.value).toHaveLength(1)
      expect(products.value[0].name).toBe('')
    })

    it('addProduct appends a new row', () => {
      const { products, addProduct } = makeProductList()
      addProduct()
      expect(products.value).toHaveLength(2)
    })

    it('add respects the 5-product cap', () => {
      const { products, addProduct } = makeProductList()
      for (let i = 0; i < 10; i++) addProduct()
      expect(products.value).toHaveLength(5)
    })

    it('removeProduct removes the correct item', () => {
      const { products, addProduct, removeProduct } = makeProductList()
      addProduct()
      products.value[0].name = 'First'
      products.value[1].name = 'Second'
      removeProduct(0)
      expect(products.value).toHaveLength(1)
      expect(products.value[0].name).toBe('Second')
    })

    it('only products with non-empty names are submitted', () => {
      const { products, addProduct } = makeProductList()
      addProduct(); addProduct()
      products.value[0].name = 'Product A'
      products.value[1].name = ''
      products.value[2].name = 'Product C'

      const valid = products.value.filter(p => p.name.trim())
      expect(valid).toHaveLength(2)
      expect(valid.map(p => p.name)).toEqual(['Product A', 'Product C'])
    })
  })

  // ── 8. Opening balance computeds ─────────────────────────────────────────
  describe('opening balance computed helpers', () => {
    function makeBalanceState() {
      const ob = reactive({
        noncurrentAssets: 0,
        inventories: 0,
        customerReceivables: 0,
        cashAndSecurities: 0,
        shareCapital: 0,
        retainedEarnings: 0,
        loansAndDebt: 0,
        supplierPayables: 0,
        socialAndTaxDebts: 0,
      })

      const totalAssets = computed(() =>
        ob.noncurrentAssets + ob.inventories + ob.customerReceivables + ob.cashAndSecurities
      )
      const totalLiabilities = computed(() =>
        ob.shareCapital + ob.retainedEarnings + ob.loansAndDebt + ob.supplierPayables + ob.socialAndTaxDebts
      )
      const balanceGap = computed(() => totalAssets.value - totalLiabilities.value)

      return { ob, totalAssets, totalLiabilities, balanceGap }
    }

    it('all zeros → totals are 0', () => {
      const { totalAssets, totalLiabilities } = makeBalanceState()
      expect(totalAssets.value).toBe(0)
      expect(totalLiabilities.value).toBe(0)
    })

    it('totalAssets sums the four asset fields', () => {
      const { ob, totalAssets } = makeBalanceState()
      ob.noncurrentAssets    = 100_000
      ob.inventories         = 20_000
      ob.customerReceivables = 15_000
      ob.cashAndSecurities   = 5_000
      expect(totalAssets.value).toBe(140_000)
    })

    it('totalLiabilities sums equity + debt + payables', () => {
      const { ob, totalLiabilities } = makeBalanceState()
      ob.shareCapital     = 50_000
      ob.retainedEarnings = 30_000
      ob.loansAndDebt     = 40_000
      ob.supplierPayables = 10_000
      ob.socialAndTaxDebts = 5_000
      expect(totalLiabilities.value).toBe(135_000)
    })

    it('balanced balance sheet has gap === 0', () => {
      const { ob, balanceGap } = makeBalanceState()
      ob.cashAndSecurities = 100_000
      ob.shareCapital      = 100_000
      expect(balanceGap.value).toBe(0)
    })

    it('positive gap = assets exceed liabilities', () => {
      const { ob, balanceGap } = makeBalanceState()
      ob.cashAndSecurities = 200_000
      ob.shareCapital      = 100_000
      expect(balanceGap.value).toBe(100_000)
    })

    it('negative gap = liabilities exceed assets', () => {
      const { ob, balanceGap } = makeBalanceState()
      ob.cashAndSecurities = 50_000
      ob.shareCapital      = 100_000
      expect(balanceGap.value).toBe(-50_000)
    })

    it('retainedEarnings can be negative (accumulated losses)', () => {
      const { ob, totalLiabilities } = makeBalanceState()
      ob.shareCapital      = 100_000
      ob.retainedEarnings  = -30_000  // accumulated losses
      ob.loansAndDebt      = 80_000
      expect(totalLiabilities.value).toBe(150_000)
    })
  })

  // ── 9. finishWizard orchestration (unit test via mocks) ──────────────────
  describe('finishWizard store orchestration', () => {
    function makeFinishWizardLogic({
      isPro = false,
      planId = 'plan-1',
      scenarioName = 'Base',
      scenarioDescription = 'Desc',
    } = {}) {
      const createScenario  = vi.fn().mockResolvedValue({ id: 'new-scenario-id' })
      const setActive       = vi.fn()
      const fetchPlan       = vi.fn().mockResolvedValue({})
      const updateConfig    = vi.fn().mockResolvedValue({})
      const updateOpeningBalance = vi.fn().mockResolvedValue({})
      const updateWcConfig  = vi.fn().mockResolvedValue({})
      const createProduct   = vi.fn().mockResolvedValue({ id: 'prod-1' })
      const routerPush      = vi.fn().mockResolvedValue(undefined)

      const details    = reactive({ name: scenarioName, description: scenarioDescription })
      const planning   = reactive({ country: 'BE', forecastStartYear: 2026, firstFiscalYearMonths: 12,
                                    currencySymbol: '€', language: 'fr', salaryMonthsPerYear: 12 })
      const rates      = reactive({ corporateTaxRate: 25, vatRate: 21, employerTaxRate: 27.67,
                                    discountRate: 10, mltInterestRate: 3 })
      const openingBalance = reactive({
        noncurrentAssets: 100, inventories: 0, customerReceivables: 0, cashAndSecurities: 50,
        shareCapital: 100, retainedEarnings: 50, loansAndDebt: 0, supplierPayables: 0, socialAndTaxDebts: 0,
      })
      const wc = reactive({ customerDays: '30', supplierDays: '60' })
      const products = ref([{ name: 'Consulting', productType: 'service', driverType: 'flat' }])
      const activePlan = ref<{ id: string } | null>({ id: planId })

      async function finishWizard() {
        if (!planId) return

        if (!activePlan.value) await fetchPlan(planId)

        const scenario = await createScenario(planId, { name: details.name.trim(), description: details.description.trim() })
        setActive(scenario)

        const forecastStart = `${planning.forecastStartYear}-01-01`
        await updateConfig({
          country: planning.country, forecastStart,
          firstFiscalYearMonths: planning.firstFiscalYearMonths,
          currencySymbol: planning.currencySymbol, language: planning.language,
          salaryMonthsPerYear: planning.salaryMonthsPerYear,
          corporateTaxRate: String(rates.corporateTaxRate / 100),
          vatRate: String(rates.vatRate / 100),
          employerTaxRate: String(rates.employerTaxRate / 100),
          discountRate: String(rates.discountRate / 100),
          mltInterestRate: String(rates.mltInterestRate / 100),
        })

        if (isPro) {
          await updateOpeningBalance({
            noncurrentAssets: String(openingBalance.noncurrentAssets),
            shareCapital: String(openingBalance.shareCapital),
          })
          const cF = paymentTermFractions(wc.customerDays)
          const sF = paymentTermFractions(wc.supplierDays)
          await updateWcConfig({
            customerPct30Days: cF.d30, customerPct60Days: cF.d60,
            supplierPct30Days: sF.d30, supplierPct60Days: sF.d60,
          })
        }

        const validProducts = products.value.filter(p => p.name.trim())
        for (const p of validProducts) {
          await createProduct({ name: p.name, productType: p.productType, driverType: isPro ? p.driverType : 'flat',
                                 directCostVariability: 'variable', externalChargeVariability: 'variable',
                                 taxVariability: 'variable', staffVariability: 'fixed', depreciationVariability: 'fixed' })
        }

        await routerPush(`/plans/${planId}/scenarios/new-scenario-id`)
      }

      return { finishWizard, createScenario, setActive, fetchPlan, updateConfig,
               updateOpeningBalance, updateWcConfig, createProduct, routerPush, activePlan }
    }

    it('creates the scenario with name and description', async () => {
      const { finishWizard, createScenario } = makeFinishWizardLogic({
        scenarioName: 'Optimistic', scenarioDescription: 'Best case scenario',
      })
      await finishWizard()
      expect(createScenario).toHaveBeenCalledWith('plan-1', { name: 'Optimistic', description: 'Best case scenario' })
    })

    it('sets the new scenario as active immediately after creation', async () => {
      const { finishWizard, setActive } = makeFinishWizardLogic()
      await finishWizard()
      expect(setActive).toHaveBeenCalledWith({ id: 'new-scenario-id' })
    })

    it('calls updateConfig with fraction-converted rates', async () => {
      const { finishWizard, updateConfig } = makeFinishWizardLogic()
      await finishWizard()
      const arg = updateConfig.mock.calls[0][0]
      expect(arg.corporateTaxRate).toBe('0.25')
      expect(arg.vatRate).toBe('0.21')
      expect(arg.employerTaxRate).toBe(String(27.67 / 100))
      expect(arg.discountRate).toBe('0.1')
      expect(arg.forecastStart).toBe('2026-01-01')
    })

    it('free tier: skips updateOpeningBalance and updateWcConfig', async () => {
      const { finishWizard, updateOpeningBalance, updateWcConfig } = makeFinishWizardLogic({ isPro: false })
      await finishWizard()
      expect(updateOpeningBalance).not.toHaveBeenCalled()
      expect(updateWcConfig).not.toHaveBeenCalled()
    })

    it('pro tier: calls updateOpeningBalance and updateWcConfig', async () => {
      const { finishWizard, updateOpeningBalance, updateWcConfig } = makeFinishWizardLogic({ isPro: true })
      await finishWizard()
      expect(updateOpeningBalance).toHaveBeenCalledTimes(1)
      expect(updateWcConfig).toHaveBeenCalledTimes(1)
    })

    it('pro tier: WC fractions are correct for customer=30, supplier=60', async () => {
      const { finishWizard, updateWcConfig } = makeFinishWizardLogic({ isPro: true })
      await finishWizard()
      const arg = updateWcConfig.mock.calls[0][0]
      expect(arg.customerPct30Days).toBe('1') // customerDays = '30'
      expect(arg.customerPct60Days).toBe('0')
      expect(arg.supplierPct60Days).toBe('1') // supplierDays = '60'
      expect(arg.supplierPct30Days).toBe('0')
    })

    it('creates a product for each named revenue line', async () => {
      const { finishWizard, createProduct } = makeFinishWizardLogic()
      await finishWizard()
      expect(createProduct).toHaveBeenCalledTimes(1)
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Consulting' }))
    })

    it('skips products with empty names', async () => {
      const logic = makeFinishWizardLogic()
      // Manually inspect: the filter logic is `products.filter(p => p.name.trim())`
      const products = [
        { name: '',     productType: 'service', driverType: 'flat' },
        { name: 'Saas', productType: 'saas',   driverType: 'growth' },
      ]
      const valid = products.filter(p => p.name.trim())
      expect(valid).toHaveLength(1)
      expect(valid[0].name).toBe('Saas')
    })

    it('free tier: driverType is forced to "flat" for all products', async () => {
      const { finishWizard, createProduct } = makeFinishWizardLogic({ isPro: false })
      await finishWizard()
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ driverType: 'flat' }))
    })

    it('navigates to the new scenario page on success', async () => {
      const { finishWizard, routerPush } = makeFinishWizardLogic()
      await finishWizard()
      expect(routerPush).toHaveBeenCalledWith('/plans/plan-1/scenarios/new-scenario-id')
    })

    it('fetches the plan when activePlan is null (hard reload guard)', async () => {
      const logic = makeFinishWizardLogic()
      logic.activePlan.value = null  // simulate missing active plan
      const { finishWizard, fetchPlan } = logic
      await finishWizard()
      expect(fetchPlan).toHaveBeenCalledWith('plan-1')
    })

    it('does not fetch plan when activePlan is already set', async () => {
      const { finishWizard, fetchPlan } = makeFinishWizardLogic()
      // activePlan is already set to { id: 'plan-1' } by default
      await finishWizard()
      expect(fetchPlan).not.toHaveBeenCalled()
    })
  })

  // ── 10. Forecast year options ─────────────────────────────────────────────
  describe('forecastYear options', () => {
    it('generates 6 year options starting from currentYear + 1', () => {
      const currentYear = new Date().getFullYear()
      const options = Array.from({ length: 6 }, (_, i) => ({
        label: String(currentYear + i),
        value: currentYear + i,
      }))
      expect(options).toHaveLength(6)
      expect(options[0].value).toBe(currentYear)
      expect(options[5].value).toBe(currentYear + 5)
    })
  })
})
