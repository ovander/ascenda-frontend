/**
 * aiStore.spec.ts
 *
 * Tests for the AI narration store, focusing on:
 *   - buildBaseContext(): driver-context enrichment (primary_driver_type,
 *     product_economics, per-driver KPI metric extraction)
 *   - derivePrimaryDriverType(): dominant-driver election logic
 *   - fetchNarration(): pre-warm behaviour and context forwarding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type {
  Product,
  SaaSParams,
  ConsultingParams,
  MarketplaceParams,
  MediaParams,
  IndustryParams,
  SessionBasedParams,
} from '@/types'

// ── Mock: AI axios instance ──────────────────────────────────────────────────
const mockAiPost = vi.fn()
vi.mock('@/composables/useApi', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  useAIApi: vi.fn(() => ({ post: mockAiPost })),
}))

// ── Mock: plan / scenario context ────────────────────────────────────────────
vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-1', name: 'My Plan' } })),
}))
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'sc-1', name: 'Base' } })),
}))

// ── Mock: settings ───────────────────────────────────────────────────────────
const mockSettingsState = { config: { currency: 'EUR', language: 'fr' as 'fr' | 'en' } }
vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => mockSettingsState),
}))

// ── Mock: auth ───────────────────────────────────────────────────────────────
vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { value: { role: 'user' } } })),
}))

// ── Mock: report store ───────────────────────────────────────────────────────
const mockFetchFullReport = vi.fn().mockResolvedValue(undefined)
const mockReportState = { fullReport: null as any }
vi.mock('@/features/report/stores/reportStore', () => ({
  useReportStore: vi.fn(() => ({
    get fullReport() { return mockReportState.fullReport },
    fetchFullReport: mockFetchFullReport,
  })),
}))

// ── Mock: product store ──────────────────────────────────────────────────────
const mockFetchProducts = vi.fn().mockResolvedValue(undefined)
const mockProductState = { products: [] as Product[] }
vi.mock('@/features/products/stores/productStore', () => ({
  useProductStore: vi.fn(() => ({
    get products() { return mockProductState.products },
    fetchProducts: mockFetchProducts,
  })),
}))

// ── Import store under test (after all mocks) ────────────────────────────────
import { useAIStore } from './aiStore'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const pnlYears = [
  { year: 2024, sales: 100, ebitda: 20, netProfit: 10, cashFlow: 15 },
  { year: 2025, sales: 120, ebitda: 25, netProfit: 14, cashFlow: 18 },
  { year: 2026, sales: 150, ebitda: 35, netProfit: 22, cashFlow: 28 },
]

const saasParams: SaaSParams = {
  activeUsers:      [100, 200, 350, 500, 700],
  monthlyFee:       ['49', '49', '59', '59', '69'],
  churnRate:        ['0.03', '0.03', '0.025', '0.025', '0.02'],
  expansionRate:    ['0.05', '0.05', '0.06', '0.06', '0.07'],
  infraCostPerUser: ['2', '2', '2', '2', '2'],
  supportCostPerUser: ['1', '1', '1', '1', '1'],
}

const consultingParams: ConsultingParams = {
  headcount:       ['2', '2', '3', '3', '4'],
  workingDays:     220,
  utilizationRate: ['0.80', '0.80', '0.80', '0.85', '0.85'],
  monthlyGross:    ['5000', '5000', '5500', '5500', '6000'],
  employerCharges: '0.45',
}

const marketplaceParams: MarketplaceParams = {
  transactions:       [500, 700, 1000, 1400, 2000],
  gmvPerTransaction:  ['80', '80', '85', '85', '90'],
  takeRate:           ['0.12', '0.12', '0.13', '0.13', '0.14'],
  paymentCost:        ['0.02', '0.02', '0.02', '0.02', '0.02'],
  fixedInfraCost:     ['2000', '2000', '2500', '2500', '3000'],
}

const mediaParams: MediaParams = {
  impressions:              [1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000],
  cpm:                      ['5', '5', '5.5', '5.5', '6'],
  fillRate:                 ['0.65', '0.65', '0.70', '0.70', '0.75'],
  contentCost:              ['1000', '1000', '1200', '1200', '1500'],
  deliveryCostPerImpression:['0.001', '0.001', '0.001', '0.001', '0.001'],
}

const industryParams: IndustryParams = {
  productionCapacity: [500, 600, 750, 900, 1000],
  scrapRate:          ['0.02', '0.02', '0.015', '0.015', '0.01'],
  setupCost:          ['500', '500', '500', '500', '500'],
}

const sessionParams: SessionBasedParams = {
  sessions:                   [20, 24, 30, 36, 40],
  participantsPerSession:     ['15', '15', '20', '20', '20'],
  fillRate:                   ['0.80', '0.80', '0.85', '0.85', '0.90'],
  pricePerParticipant:        ['250', '250', '275', '275', '300'],
  trainerCount:               ['2', '2', '3', '3', '3'],
  sessionsPerTrainer:         [10, 10, 12, 12, 12],
  utilizationRate:            ['0.80', '0.80', '0.80', '0.85', '0.85'],
  trainerCostPerSession:      ['500', '500', '600', '600', '700'],
  variableCostPerParticipant: ['20', '20', '25', '25', '30'],
}

function makeProduct(overrides: Partial<Product> & { driverType: Product['driverType'] }): Product {
  return {
    id: 'prod-1',
    scenarioId: 'sc-1',
    name: 'Test Product',
    sortOrder: 0,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAIStore', () => {
  let store: ReturnType<typeof useAIStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAIStore()
    mockProductState.products = []
    mockReportState.fullReport = null
    mockSettingsState.config = { currency: 'EUR', language: 'fr' }
    vi.clearAllMocks()
    mockFetchFullReport.mockResolvedValue(undefined)
    mockFetchProducts.mockResolvedValue(undefined)
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('narration is null', () => { expect(store.narration).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  // ── buildBaseContext: language propagation ─────────────────────────────────

  describe('buildBaseContext — language propagation', () => {
    it('includes language from settings config (fr)', () => {
      mockSettingsState.config = { currency: 'EUR', language: 'fr' }
      const ctx = store.buildBaseContext()
      expect(ctx.language).toBe('fr')
    })

    it('includes language from settings config (en)', () => {
      mockSettingsState.config = { currency: 'EUR', language: 'en' }
      const ctx = store.buildBaseContext()
      expect(ctx.language).toBe('en')
    })

    it('defaults to "fr" when config is missing language', () => {
      mockSettingsState.config = { currency: 'EUR' } as any
      const ctx = store.buildBaseContext()
      expect(ctx.language).toBe('fr')
    })

    it('includes currency from settings config', () => {
      mockSettingsState.config = { currency: 'USD', language: 'en' }
      const ctx = store.buildBaseContext()
      expect(ctx.currency).toBe('USD')
    })
  })

  // ── buildBaseContext: P&L metrics (existing behaviour preserved) ───────────

  describe('buildBaseContext — P&L metrics', () => {
    beforeEach(() => {
      mockReportState.fullReport = { pnl: { years: pnlYears } }
    })

    it('includes plan and scenario names', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.plan_name).toBe('My Plan')
      expect(ctx.scenario_name).toBe('Base')
    })

    it('builds period_label from P&L year range', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.period_label).toBe('FY 2024–2026')
    })

    it('sets revenue value from last year', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.revenue?.value).toBe(150)
    })

    it('embeds multi-year series in revenue note', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.revenue?.note).toContain('2024: 100')
      expect(ctx.revenue?.note).toContain('2026: 150')
    })

    it('sets ebitda and net_income from last year', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.ebitda?.value).toBe(35)
      expect(ctx.net_income?.value).toBe(22)
    })

    it('omits driver fields when no products loaded', () => {
      const ctx = store.buildBaseContext()
      expect(ctx.primary_driver_type).toBeUndefined()
      expect(ctx.product_economics).toBeUndefined()
    })
  })

  // ── buildBaseContext: driver context — generic products ────────────────────

  describe('buildBaseContext — generic products only', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Widget', driverType: 'generic' }),
        makeProduct({ id: 'p2', name: 'Gadget', driverType: 'generic' }),
      ]
    })

    it('does not set primary_driver_type', () => {
      expect(store.buildBaseContext().primary_driver_type).toBeUndefined()
    })

    it('does not set product_economics', () => {
      expect(store.buildBaseContext().product_economics).toBeUndefined()
    })
  })

  // ── buildBaseContext: SaaS driver ──────────────────────────────────────────

  describe('buildBaseContext — SaaS driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Cloud App', driverType: 'saas', driverParams: saasParams }),
      ]
    })

    it('sets primary_driver_type to "saas"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('saas')
    })

    it('includes one entry in product_economics', () => {
      expect(store.buildBaseContext().product_economics).toHaveLength(1)
    })

    it('sets product_name and driver_type on entry', () => {
      const entry = store.buildBaseContext().product_economics![0]
      expect(entry.product_name).toBe('Cloud App')
      expect(entry.driver_type).toBe('saas')
    })

    it('extracts active users Y5 as metric', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const users = metrics.find((m) => m.label === 'Active Users (Y5)')
      expect(users?.value).toBe(700)
    })

    it('includes Y1–Y5 series in active users note', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const users = metrics.find((m) => m.label === 'Active Users (Y5)')
      expect(users?.note).toBe('Y1: 100 | Y2: 200 | Y3: 350 | Y4: 500 | Y5: 700')
    })

    it('extracts monthly fee Y5 as metric', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const fee = metrics.find((m) => m.label === 'Monthly Fee')
      expect(fee?.value).toBe(69)
      expect(fee?.currency).toBe('EUR')
    })

    it('extracts churn rate Y5 as metric', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const churn = metrics.find((m) => m.label === 'Churn Rate')
      expect(churn?.value).toBeCloseTo(0.02)
      expect(churn?.unit).toBe('%')
    })

    it('extracts expansion rate Y5 as metric', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const exp = metrics.find((m) => m.label === 'Expansion Rate')
      expect(exp?.value).toBeCloseTo(0.07)
    })

    it('passes raw driver_params through', () => {
      const entry = store.buildBaseContext().product_economics![0]
      expect(entry.driver_params).toMatchObject({ activeUsers: saasParams.activeUsers })
    })
  })

  // ── buildBaseContext: Consulting driver ────────────────────────────────────

  describe('buildBaseContext — Consulting driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Acme Consulting', driverType: 'consulting', driverParams: consultingParams }),
      ]
    })

    it('sets primary_driver_type to "consulting"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('consulting')
    })

    it('extracts headcount Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const hc = metrics.find((m) => m.label === 'Headcount (Y5)')
      expect(hc?.value).toBe(4)
    })

    it('includes Y1–Y5 series in headcount note', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const hc = metrics.find((m) => m.label === 'Headcount (Y5)')
      expect(hc?.note).toBe('Y1: 2 | Y2: 2 | Y3: 3 | Y4: 3 | Y5: 4')
    })

    it('extracts utilization rate Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const util = metrics.find((m) => m.label === 'Utilization Rate')
      expect(util?.value).toBeCloseTo(0.85)
      expect(util?.unit).toBe('%')
    })

    it('extracts monthly gross Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const gross = metrics.find((m) => m.label === 'Monthly Gross')
      expect(gross?.value).toBe(6000)
      expect(gross?.currency).toBe('EUR')
    })
  })

  // ── buildBaseContext: Marketplace driver ───────────────────────────────────

  describe('buildBaseContext — Marketplace driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Bazaar', driverType: 'marketplace', driverParams: marketplaceParams }),
      ]
    })

    it('sets primary_driver_type to "marketplace"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('marketplace')
    })

    it('extracts transactions Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const tx = metrics.find((m) => m.label === 'Transactions (Y5)')
      expect(tx?.value).toBe(2000)
    })

    it('extracts GMV per transaction Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const gmv = metrics.find((m) => m.label === 'GMV per Transaction')
      expect(gmv?.value).toBe(90)
      expect(gmv?.currency).toBe('EUR')
    })

    it('extracts take rate Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const take = metrics.find((m) => m.label === 'Take Rate')
      expect(take?.value).toBeCloseTo(0.14)
    })
  })

  // ── buildBaseContext: Media driver ─────────────────────────────────────────

  describe('buildBaseContext — Media driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'AdNetwork', driverType: 'media', driverParams: mediaParams }),
      ]
    })

    it('sets primary_driver_type to "media"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('media')
    })

    it('extracts impressions Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const imp = metrics.find((m) => m.label === 'Impressions (Y5)')
      expect(imp?.value).toBe(3_000_000)
    })

    it('extracts CPM Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const cpm = metrics.find((m) => m.label === 'CPM')
      expect(cpm?.value).toBe(6)
    })

    it('extracts fill rate Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const fill = metrics.find((m) => m.label === 'Fill Rate')
      expect(fill?.value).toBeCloseTo(0.75)
    })
  })

  // ── buildBaseContext: Industry driver ──────────────────────────────────────

  describe('buildBaseContext — Industry driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Factory', driverType: 'industry', driverParams: industryParams }),
      ]
    })

    it('sets primary_driver_type to "industry"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('industry')
    })

    it('extracts production capacity Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const cap = metrics.find((m) => m.label === 'Production Capacity (Y5)')
      expect(cap?.value).toBe(1000)
    })

    it('extracts scrap rate Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const scrap = metrics.find((m) => m.label === 'Scrap Rate')
      expect(scrap?.value).toBeCloseTo(0.01)
    })
  })

  // ── buildBaseContext: Session-based driver ─────────────────────────────────

  describe('buildBaseContext — Session-based driver', () => {
    beforeEach(() => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Workshop', driverType: 'session_based', driverParams: sessionParams }),
      ]
    })

    it('sets primary_driver_type to "session_based"', () => {
      expect(store.buildBaseContext().primary_driver_type).toBe('session_based')
    })

    it('extracts sessions Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const sessions = metrics.find((m) => m.label === 'Sessions (Y5)')
      expect(sessions?.value).toBe(40)
    })

    it('extracts price per participant Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const price = metrics.find((m) => m.label === 'Price per Participant')
      expect(price?.value).toBe(300)
      expect(price?.currency).toBe('EUR')
    })

    it('extracts fill rate Y5', () => {
      const metrics = store.buildBaseContext().product_economics![0].metrics
      const fill = metrics.find((m) => m.label === 'Fill Rate')
      expect(fill?.value).toBeCloseTo(0.9)
    })
  })

  // ── buildBaseContext: primary driver election ──────────────────────────────

  describe('buildBaseContext — primary_driver_type election', () => {
    it('picks the most-frequent non-generic driver', () => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'App A', driverType: 'saas', driverParams: saasParams }),
        makeProduct({ id: 'p2', name: 'App B', driverType: 'saas', driverParams: saasParams }),
        makeProduct({ id: 'p3', name: 'Firm C', driverType: 'consulting', driverParams: consultingParams }),
      ]
      expect(store.buildBaseContext().primary_driver_type).toBe('saas')
    })

    it('falls back to the only non-generic driver when rest are generic', () => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Generic', driverType: 'generic' }),
        makeProduct({ id: 'p2', name: 'Market', driverType: 'marketplace', driverParams: marketplaceParams }),
      ]
      expect(store.buildBaseContext().primary_driver_type).toBe('marketplace')
    })

    it('excludes generic products from product_economics', () => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Generic', driverType: 'generic' }),
        makeProduct({ id: 'p2', name: 'SaaS', driverType: 'saas', driverParams: saasParams }),
      ]
      const ctx = store.buildBaseContext()
      expect(ctx.product_economics).toHaveLength(1)
      expect(ctx.product_economics![0].product_name).toBe('SaaS')
    })

    it('excludes products with null driverParams from product_economics', () => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Incomplete', driverType: 'saas', driverParams: null }),
      ]
      // driverParams is null → treated as generic / no KPIs → omitted
      expect(store.buildBaseContext().product_economics).toBeUndefined()
    })

    it('builds economics for all non-generic products in a mixed portfolio', () => {
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'App', driverType: 'saas', driverParams: saasParams }),
        makeProduct({ id: 'p2', name: 'Firm', driverType: 'consulting', driverParams: consultingParams }),
        makeProduct({ id: 'p3', name: 'Widget', driverType: 'generic' }),
      ]
      const ctx = store.buildBaseContext()
      expect(ctx.product_economics).toHaveLength(2)
      expect(ctx.product_economics!.map((e) => e.product_name)).toEqual(['App', 'Firm'])
    })
  })

  // ── fetchNarration: pre-warm behaviour ────────────────────────────────────

  describe('fetchNarration — pre-warm', () => {
    beforeEach(() => {
      mockAiPost.mockResolvedValue({
        data: { narration: { title: 'T', summary: 'S', paragraphs: [], key_takeaways: [], is_ai_generated: true } },
      })
    })

    it('always calls fetchFullReport before posting', async () => {
      await store.fetchNarration('narrate')
      expect(mockFetchFullReport).toHaveBeenCalledTimes(1)
    })

    it('calls fetchProducts when products array is empty', async () => {
      mockProductState.products = []
      await store.fetchNarration('narrate')
      expect(mockFetchProducts).toHaveBeenCalledTimes(1)
    })

    it('skips fetchProducts when products already loaded', async () => {
      mockProductState.products = [makeProduct({ driverType: 'saas', driverParams: saasParams })]
      await store.fetchNarration('narrate')
      expect(mockFetchProducts).not.toHaveBeenCalled()
    })

    it('proceeds even if fetchFullReport fails', async () => {
      mockFetchFullReport.mockRejectedValue(new Error('Network error'))
      await store.fetchNarration('narrate')
      expect(store.narration).not.toBeNull()
    })

    it('proceeds even if fetchProducts fails', async () => {
      mockProductState.products = []
      mockFetchProducts.mockRejectedValue(new Error('Network error'))
      await store.fetchNarration('narrate')
      expect(store.narration).not.toBeNull()
    })
  })

  // ── fetchNarration: context forwarding ────────────────────────────────────

  describe('fetchNarration — context forwarding', () => {
    beforeEach(() => {
      mockReportState.fullReport = { pnl: { years: pnlYears } }
      mockProductState.products = [
        makeProduct({ id: 'p1', name: 'Cloud', driverType: 'saas', driverParams: saasParams }),
      ]
      mockAiPost.mockResolvedValue({
        data: { narration: { title: 'T', summary: 'S', paragraphs: [], key_takeaways: [], is_ai_generated: true } },
      })
    })

    it('posts to the correct endpoint', async () => {
      await store.fetchNarration('unit-economics')
      expect(mockAiPost).toHaveBeenCalledWith(
        '/api/v1/plans/plan-1/scenarios/sc-1/ai/unit-economics',
        expect.anything(),
      )
    })

    it('includes primary_driver_type in posted context', async () => {
      await store.fetchNarration('narrate')
      const body = mockAiPost.mock.calls[0][1]
      expect(body.context.primary_driver_type).toBe('saas')
    })

    it('includes product_economics in posted context', async () => {
      await store.fetchNarration('narrate')
      const body = mockAiPost.mock.calls[0][1]
      expect(body.context.product_economics).toHaveLength(1)
      expect(body.context.product_economics[0].driver_type).toBe('saas')
    })

    it('includes P&L revenue in posted context', async () => {
      await store.fetchNarration('narrate')
      const body = mockAiPost.mock.calls[0][1]
      expect(body.context.revenue?.value).toBe(150)
    })

    it('extraContext overrides base context fields', async () => {
      await store.fetchNarration('narrate', { narration_type: 'plan_summary' })
      const body = mockAiPost.mock.calls[0][1]
      expect(body.context.narration_type).toBe('plan_summary')
    })

    it('extraContext cannot accidentally clear driver fields', async () => {
      await store.fetchNarration('narrate', { scenario_type: 'bear' })
      const body = mockAiPost.mock.calls[0][1]
      // driver fields from base context are still present
      expect(body.context.primary_driver_type).toBe('saas')
    })
  })

  // ── fetchNarration: state management ─────────────────────────────────────

  describe('fetchNarration — state management', () => {
    it('sets loading to true during fetch, false after', async () => {
      let loadingDuring = false
      mockAiPost.mockImplementation(async () => {
        loadingDuring = store.loading
        return { data: { narration: { title: '', summary: '', paragraphs: [], key_takeaways: [], is_ai_generated: true } } }
      })
      await store.fetchNarration('narrate')
      expect(loadingDuring).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('stores narration on success', async () => {
      const narration = { title: 'Plan Summary', summary: 'Good plan.', paragraphs: [], key_takeaways: ['Growing'], is_ai_generated: true }
      mockAiPost.mockResolvedValue({ data: { narration } })
      await store.fetchNarration('narrate')
      expect(store.narration).toEqual(narration)
    })

    it('sets error and clears narration on API failure', async () => {
      mockAiPost.mockRejectedValue({ response: { data: { error: { message: 'Quota exceeded' } } } })
      await store.fetchNarration('narrate')
      expect(store.narration).toBeNull()
      expect(store.error).toBe('Quota exceeded')
    })

    it('shows service-unavailable message when no HTTP response (ERR_EMPTY_RESPONSE)', async () => {
      // Simulate a network error where the backend closes the connection without
      // sending any HTTP response (Go panic, ERR_EMPTY_RESPONSE, timeout, etc.).
      // Axios sets err.response = undefined and err.request = <XMLHttpRequest> in
      // this case — we mimic that by omitting the response property.
      const networkError = new Error('Network Error') as any
      networkError.request = {} // request was sent
      // networkError.response is intentionally undefined
      mockAiPost.mockRejectedValue(networkError)
      await store.fetchNarration('unit-economics')
      expect(store.narration).toBeNull()
      expect(store.error).toBe('AI service is temporarily unavailable. Please try again later.')
    })

    it('falls back to generic message when API error body has no message field', async () => {
      mockAiPost.mockRejectedValue({ response: { data: {} } })
      await store.fetchNarration('narrate')
      expect(store.error).toBe('AI narration failed')
    })

    it('resets narration to null at start of each call', async () => {
      const narration = { title: 'Old', summary: '', paragraphs: [], key_takeaways: [], is_ai_generated: true }
      mockAiPost.mockResolvedValueOnce({ data: { narration } })
      await store.fetchNarration('narrate')
      expect(store.narration).not.toBeNull()

      mockAiPost.mockRejectedValue(new Error('fail'))
      await store.fetchNarration('narrate')
      expect(store.narration).toBeNull()
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears narration, error and loading', async () => {
      mockAiPost.mockRejectedValue({ response: { data: { error: { message: 'fail' } } } })
      await store.fetchNarration('narrate')
      store.reset()
      expect(store.narration).toBeNull()
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })
  })

  // ── Convenience wrappers ──────────────────────────────────────────────────

  describe('convenience wrappers', () => {
    beforeEach(() => {
      mockAiPost.mockResolvedValue({
        data: { narration: { title: '', summary: '', paragraphs: [], key_takeaways: [], is_ai_generated: true } },
      })
    })

    it('fetchUnitEconomics posts to unit-economics', async () => {
      await store.fetchUnitEconomics()
      expect(mockAiPost).toHaveBeenCalledWith(expect.stringContaining('unit-economics'), expect.anything())
    })

    it('fetchBenchmarkCommentary posts to benchmark-commentary', async () => {
      await store.fetchBenchmarkCommentary()
      expect(mockAiPost).toHaveBeenCalledWith(expect.stringContaining('benchmark-commentary'), expect.anything())
    })

    it('fetchDriverAdvisor posts to driver-advisor', async () => {
      await store.fetchDriverAdvisor()
      expect(mockAiPost).toHaveBeenCalledWith(expect.stringContaining('driver-advisor'), expect.anything())
    })

    it('fetchPortfolioMix posts to portfolio-mix', async () => {
      await store.fetchPortfolioMix()
      expect(mockAiPost).toHaveBeenCalledWith(expect.stringContaining('portfolio-mix'), expect.anything())
    })

    it('fetchScenarioSuggestion forwards scenario_type in context', async () => {
      await store.fetchScenarioSuggestion('bear')
      const body = mockAiPost.mock.calls[0][1]
      expect(body.context.scenario_type).toBe('bear')
    })

    it('fetchInvestorMemo posts to investor-memo', async () => {
      await store.fetchInvestorMemo()
      expect(mockAiPost).toHaveBeenCalledWith(expect.stringContaining('investor-memo'), expect.anything())
    })
  })
})
