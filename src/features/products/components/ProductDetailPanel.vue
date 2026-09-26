<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import type {
  ProductAssumption,
  ProductSalesVolume,
  ProductDistributorMargin,
  ProductRevenueSummary,
  DriverType,
  DriverParams,
  ProductDerivedBundle,
} from '@/types'
import type { GridRow } from '@/components/common/KYearGrid.vue'
import { productUnits } from '../utils/productUnits'
import { useProductStore } from '@/features/products/stores/productStore'
import DriverParamsForm from './DriverParamsForm.vue'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { GEO_ZONES, SALES_CHANNELS, MAX_YEARS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import KYearGrid from '@/components/common/KYearGrid.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'

interface Props {
  productId: string
}

const props = defineProps<Props>()

const productStore = useProductStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, formatPercent, getLocale, getUnitLabel } = useDecimal()
const unitLabel = computed(() => getUnitLabel())

// 'service' products bill in days; physical products sell in units
const currentProduct = computed(() => productStore.products.find((p) => p.id === props.productId))
const isService = computed(() => currentProduct.value?.productType === 'service')
const units = computed(() => productUnits(currentProduct.value?.driverType, currentProduct.value?.productType))
const volumeLabel = computed(() => units.value.plural)

// ── Business Driver Framework ─────────────────────────────────────────────
/** True when the product uses a typed driver (not 'generic'). */
const isDriverManaged = computed(() => {
  const dt = currentProduct.value?.driverType
  return !!dt && dt !== 'generic'
})

/**
 * Distributor / partner margins only apply to sales through the indirect
 * channel. Every driver except industry derives its volumes as direct sales,
 * so for those products the margins tab would change nothing.
 */
const hasIndirectSales = computed(() =>
  !isDriverManaged.value || currentProduct.value?.driverType === 'industry',
)

/**
 * The contract driver's volume is 1 for each year with revenue and it has no
 * cost inputs: its revenue is the sum of the contracts, not a volume × price.
 * The volumes tab and the cost row would only show that bookkeeping.
 */
const isContract = computed(() => currentProduct.value?.driverType === 'contract')

/** Local copy of driverType for the driver tab selector. */
const localDriverType = ref<DriverType>('generic')
/** Local copy of driverParams edited in the Driver tab. */
const localDriverParams = ref<DriverParams>(null)
/** Derived bundle fetched from the backend after saving driver params. */
const derivedBundle = ref<ProductDerivedBundle | null>(null)
const driverSaving = ref(false)
const driverError = ref<string | null>(null)

// Sync local driver state whenever the product changes in the store
watch(
  currentProduct,
  (p) => {
    if (!p) return
    localDriverType.value = p.driverType ?? 'generic'
    localDriverParams.value = p.driverParams ?? null
  },
  { immediate: true }
)

/** Debounced: save driver params then re-fetch the derived bundle. */
const debouncedSaveDriver = debounce(async () => {
  driverSaving.value = true
  driverError.value = null
  try {
    await productStore.updateDriverParams(
      props.productId,
      localDriverType.value,
      localDriverParams.value
    )
    // Re-fetch derived bundle so derived tabs show fresh data
    derivedBundle.value = await productStore.fetchDerivedBundle(props.productId)
    // Also refresh revenue summary
    revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
  } catch (err: any) {
    driverError.value = err?.message ?? 'Failed to save driver configuration'
  } finally {
    driverSaving.value = false
  }
}, 800)

// TODO: Future driver type change handler
// function handleDriverTypeChange(dt: DriverType) {
//   localDriverType.value = dt
//   // Reset params when switching driver type so defaults are seeded by DriverParamsForm
//   localDriverParams.value = null
//   debouncedSaveDriver()
// }

function handleDriverParamsChange(params: DriverParams) {
  localDriverParams.value = params
  debouncedSaveDriver()
}

// ── Derived bundle grid rows (read-only views for driver-managed products) ──
const derivedAssumptionsGridRows = computed<GridRow[]>(() => {
  const bundle = derivedBundle.value
  if (!bundle) return []
  const rows: GridRow[] = []

  const bupRow: GridRow = {
    id: `${props.productId}-derived-bup`,
    label: units.value.priceLabel,
    values: [],
    editable: false,
    isComputed: true,
    decimals: 2,
    suffix: '€',
  }
  const rmcRow: GridRow = {
    id: `${props.productId}-derived-rmc`,
    label: units.value.costLabel,
    values: [],
    editable: false,
    isComputed: true,
    decimals: 2,
    suffix: '€',
  }

  ;(bundle.assumptions ?? []).forEach((a, i) => {
    bupRow.values[i] = Number(a.baseUnitPrice)
    rmcRow.values[i] = Number(a.rawMaterialCost)
  })

  rows.push(bupRow)
  if (!isContract.value) rows.push(rmcRow)
  return rows
})

const derivedVolumesGridRows = computed<GridRow[]>(() => {
  const bundle = derivedBundle.value
  if (!bundle) return []
  const rows: GridRow[] = []

  const byZoneChannel: Record<string, number[]> = {}
  for (const v of (bundle.volumes ?? [])) {
    const key = `${v.channel}-${v.zone}`
    if (!byZoneChannel[key]) byZoneChannel[key] = [0, 0, 0, 0, 0]
    const idx = v.yearIndex - 1
    if (idx >= 0 && idx < 5) byZoneChannel[key][idx] = Number(v.unitsSold)
  }

  for (const [key, values] of Object.entries(byZoneChannel)) {
    const [channel, zone] = key.split('-')
    rows.push({
      id: `${props.productId}-derived-vol-${key}`,
      label: `${zone} / ${channel}`,
      values,
      editable: false,
      isComputed: true,
      decimals: 0,
      suffix: volumeLabel.value,
      kind: 'quantity',
    })
  }
  return rows
})

const activeTab = ref('assumptions')
const loading = ref(false)
const devGenerating = ref(false)
const isDev = import.meta.env.DEV

// State for assumptions
const assumptions = ref<ProductAssumption[]>([])

// State for volumes
const volumes = ref<ProductSalesVolume[]>([])

// State for margins
const margins = ref<ProductDistributorMargin[]>([])

// State for revenue
const revenueSummary = ref<ProductRevenueSummary | null>(null)

// Computed grid rows for Key Assumptions tab
const assumptionsGridRows = computed<GridRow[]>(() => {
  const rows: GridRow[] = []
  const service = isService.value

  for (let yearIndex = 0; yearIndex < MAX_YEARS; yearIndex++) {
    const yearAssumptions = assumptions.value.filter((a) => a.yearIndex === yearIndex + 1)
    const mainAssumption = yearAssumptions[0] || {
      rawMaterialCost: '0',
      royaltiesCost: '0',
      logisticsCost: '0',
      costCoefficient: '0',
      baseUnitPrice: '0',
      priceCoefficient: '0',
    }

    const parseNum = (val: string | number) => {
      const n = parseFloat(String(val)) || 0
      return n
    }

    const rmc = parseNum(mainAssumption.rawMaterialCost)
    const rc  = parseNum(mainAssumption.royaltiesCost)
    const lc  = parseNum(mainAssumption.logisticsCost)
    const cc  = parseNum(mainAssumption.costCoefficient)
    const bup = parseNum(mainAssumption.baseUnitPrice)
    const pc  = parseNum(mainAssumption.priceCoefficient)

    const totalUnitCost  = (rmc + rc + lc) * (cc || 1)
    const finalUnitPrice = bup * (pc || 1)

    if (yearIndex === 0) {
      if (service) {
        // ── Consulting / Service view ────────────────────────────────────
        // RawMaterialCost stores the COGS per billable day; the other cost
        // fields (royalties, logistics, coefficients) are not used.
        rows.push({
          id: `${props.productId}-rmc-0`,
          label: 'Cost per Day (COGS)',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          tooltip: 'Direct cost attributable to one billable day: subcontractors, licences, tools, etc. This is the COGS that flows into the gross-margin calculation.',
        })
        rows.push({
          id: `${props.productId}-bup-0`,
          label: 'Day Rate (Billing)',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          tooltip: 'The rate invoiced to the client for one billable day, before any price coefficient adjustment.',
        })
        rows.push({
          id: `${props.productId}-tuc-0`,
          label: 'Total Cost/Day',
          values: [],
          editable: false,
          isComputed: true,
          decimals: 2,
          suffix: '€',
          isSubtotal: true,
          tooltip: 'Computed: equals Cost per Day (COGS) since coefficients are 1 for services.',
        })
        rows.push({
          id: `${props.productId}-fup-0`,
          label: 'Final Day Rate',
          values: [],
          editable: false,
          isComputed: true,
          decimals: 2,
          suffix: '€',
          isAggregate: true,
          tooltip: 'Computed: Day Rate × Price Coefficient. This is the rate used in all revenue calculations.',
        })
      } else {
        // ── Physical product view ────────────────────────────────────────
        rows.push({
          id: `${props.productId}-rmc-0`,
          label: 'Raw Material Cost',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Direct cost of materials used to manufacture one unit of the product (e.g. components, packaging).',
        })
        rows.push({
          id: `${props.productId}-rc-0`,
          label: 'Royalties Cost',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Per-unit fee paid to a licensor or IP holder for the right to manufacture or sell the product.',
        })
        rows.push({
          id: `${props.productId}-lc-0`,
          label: 'Logistics Cost',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Per-unit cost of shipping, warehousing and distribution to deliver the product to the customer.',
        })
        rows.push({
          id: `${props.productId}-cc-0`,
          label: 'Cost Coefficient',
          values: [],
          editable: true,
          decimals: 4,
          suffix: '×',
          kind: 'quantity',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Multiplier applied to the sum of direct costs (Raw Material + Royalties + Logistics). Default 1.0 = no change. Use 1.05 to add 5% overhead.',
        })
        rows.push({
          id: `${props.productId}-bup-0`,
          label: 'Base Unit Price',
          values: [],
          editable: true,
          decimals: 2,
          suffix: '€',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Reference selling price of one unit before applying the Price Coefficient.',
        })
        rows.push({
          id: `${props.productId}-pc-0`,
          label: 'Price Coefficient',
          values: [],
          editable: true,
          decimals: 4,
          suffix: '×',
          kind: 'quantity',
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Multiplier applied to the Base Unit Price to obtain the Final Unit Price. Default 1.0 = no change. Use 1.05 for +5% price increase.',
        })
        rows.push({
          id: `${props.productId}-tuc-0`,
          label: 'Total Unit Cost',
          values: [],
          editable: false,
          isComputed: true,
          decimals: 2,
          suffix: '€',
          isSubtotal: true,
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Computed: sum of Raw Material Cost, Royalties Cost and Logistics Cost, multiplied by the Cost Coefficient.',
        })
        rows.push({
          id: `${props.productId}-fup-0`,
          label: 'Final Unit Price',
          values: [],
          editable: false,
          isComputed: true,
          decimals: 2,
          suffix: '€',
          isAggregate: true,
          group: `Year ${yearIndex + 1}`,
          tooltip: 'Computed: Base Unit Price × Price Coefficient. This is the price used in revenue calculations.',
        })
      }
    }

    // Update values for all rows
    const rmcRow = rows.find((r) => r.id.includes('-rmc-'))
    if (rmcRow) rmcRow.values[yearIndex] = rmc
    if (!service) {
      const rcRow = rows.find((r) => r.id.includes('-rc-'))
      if (rcRow) rcRow.values[yearIndex] = rc
      const lcRow = rows.find((r) => r.id.includes('-lc-'))
      if (lcRow) lcRow.values[yearIndex] = lc
      const ccRow = rows.find((r) => r.id.includes('-cc-'))
      if (ccRow) ccRow.values[yearIndex] = cc
      const pcRow = rows.find((r) => r.id.includes('-pc-'))
      if (pcRow) pcRow.values[yearIndex] = pc
    }
    const bupRow = rows.find((r) => r.id.includes('-bup-'))
    if (bupRow) bupRow.values[yearIndex] = bup
    const tucRow = rows.find((r) => r.id.includes('-tuc-'))
    if (tucRow) tucRow.values[yearIndex] = totalUnitCost
    const fupRow = rows.find((r) => r.id.includes('-fup-'))
    if (fupRow) fupRow.values[yearIndex] = finalUnitPrice
  }

  return rows
})

// Computed grid rows for Sales Volumes tab
const volumesGridRows = computed<GridRow[]>(() => {
  const rows: GridRow[] = []

  for (const channel of SALES_CHANNELS) {
    const channelRows: GridRow[] = []

    for (const zone of GEO_ZONES) {
      const zoneVolumes = volumes.value.filter(
        (v) => v.zone === zone.key && v.channel === channel.key
      )

      const rowId = `${props.productId}-vol-${channel.key}-${zone.key}`
      const values: number[] = []

      for (let yearIndex = 0; yearIndex < MAX_YEARS; yearIndex++) {
        const vol = zoneVolumes.find((v) => v.yearIndex === yearIndex + 1)
        values[yearIndex] = vol?.unitsSold || 0
      }

      channelRows.push({
        id: rowId,
        label: `${zone.label}`,
        values,
        editable: true,
        decimals: 0,
        suffix: volumeLabel.value,
        kind: 'quantity',
        group: channel.label,
      })
    }

    rows.push(...channelRows)
  }

  return rows
})

// Computed grid rows for Distributor Margins tab
const marginsGridRows = computed<GridRow[]>(() => {
  const rows: GridRow[] = []

  for (const zone of GEO_ZONES) {
    const zoneMargins = margins.value.filter((m) => m.zone === zone.key)

    const rowId = `${props.productId}-margin-${zone.key}`
    const values: (string | number)[] = []

    for (let yearIndex = 0; yearIndex < MAX_YEARS; yearIndex++) {
      const margin = zoneMargins.find((m) => m.yearIndex === yearIndex + 1)
      values[yearIndex] = margin?.marginPercent || '0'
    }

    rows.push({
      id: rowId,
      label: `${zone.label}`,
      values,
      editable: true,
      decimals: 1,
      kind: 'percent', // stored as a fraction (0.2); the compute applies price × (1 − margin)
    })
  }

  return rows
})

// Revenue summary rows
// Backend returns decimal fields as bare JSON numbers (shopspring/decimal MarshalJSON)
// and integer fields as JSON numbers too.
const safeCurrency = (v: any) => (v != null && v !== '') ? formatUnit(v) : '—'
const safePct     = (v: any) => (v != null && v !== '') ? formatPercent(v) : '—'
const safeUnits   = (v: any) => {
  if (v == null || v === '') return '—'
  return Number(v).toLocaleString(getLocale(), { maximumFractionDigits: 0 })
}

// ── Trend helpers ────────────────────────────────────────────────────────────
type TrendDirection = 'up' | 'stable' | 'down'
interface Trend { direction: TrendDirection; pct: string }

function calcTrend(current: number, previous: number): Trend | null {
  if (previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return {
    direction: pct > 1 ? 'up' : pct < -1 ? 'down' : 'stable',
    pct: Math.abs(pct).toFixed(1),
  }
}

function trendIcon(d: TrendDirection) {
  return d === 'up' ? '↑' : d === 'down' ? '↓' : '→'
}

function trendClass(d: TrendDirection) {
  return d === 'up' ? 'trend-up' : d === 'down' ? 'trend-down' : 'trend-stable'
}

// ── Revenue summary rows with trend badges ───────────────────────────────────
const revenueSummaryRows = computed(() => {
  const years = revenueSummary.value?.years
  if (!years?.length) return []

  return years.map((year: any, i: number) => {
    const prev             = i > 0 ? years[i - 1] : null
    const turnover         = Number(year.turnover         ?? 0)
    const directSalesTotal = Number(year.directSalesTotal ?? 0)
    return {
      yearIndex:           yearHeaders.value[year.yearIndex - 1] ?? year.yearIndex,
      totalTurnover:       safeCurrency(year.turnover),
      totalCOGS:           safeCurrency(year.cogs),
      grossMargin:         safeCurrency(year.grossMargin),
      grossMarginPct:      safePct(year.grossMarginPct),
      directSales:         safeCurrency(year.directSalesTotal),
      indirectSales:       safeCurrency(turnover - directSalesTotal),
      europeExportSales:   safeCurrency(year.europeExportSales),
      totalUnitSales:      safeUnits(year.totalUnitSales),
      cumulativeUnitSales: safeUnits(year.cumulatedUnitSales),
      // Trend vs previous year (null for first year)
      trendTurnover:  prev ? calcTrend(Number(year.turnover      ?? 0), Number(prev.turnover      ?? 0)) : null,
      trendMarginPct: prev ? calcTrend(Number(year.grossMarginPct ?? 0), Number(prev.grossMarginPct ?? 0)) : null,
      trendUnits:     prev ? calcTrend(Number(year.totalUnitSales ?? 0), Number(prev.totalUnitSales ?? 0)) : null,
    }
  })
})

onMounted(async () => {
  if (!props.productId) return  // guard: don't fire any requests with an undefined id
  loading.value = true
  try {
    const fetches: Promise<any>[] = [
      productStore.fetchAssumptions(props.productId),
      productStore.fetchVolumes(props.productId),
      productStore.fetchMargins(props.productId),
    ]
    // Fetch derived bundle in parallel for driver-managed products
    if (isDriverManaged.value) {
      fetches.push(productStore.fetchDerivedBundle(props.productId))
    }
    await Promise.allSettled(fetches)

    assumptions.value = productStore.getAssumptions(props.productId)
    volumes.value = productStore.getVolumes(props.productId)
    margins.value = productStore.getMargins(props.productId)

    if (isDriverManaged.value) {
      derivedBundle.value = productStore.getDerivedBundle(props.productId) ?? null
    }

    // If no assumptions exist yet, seed all 5 years with sensible defaults
    // (coefficients = 1.0 so the grid is usable without entering them)
    if (assumptions.value.length === 0) {
      for (let y = 1; y <= MAX_YEARS; y++) {
        assumptions.value.push({
          id: `${props.productId}-${y}`,
          productId: props.productId,
          yearIndex: y,
          rawMaterialCost: '0',
          royaltiesCost: '0',
          logisticsCost: '0',
          costCoefficient: '1',
          baseUnitPrice: '0',
          priceCoefficient: '1',
        })
      }
      // Persist defaults immediately (await so revenue fetch sees the new rows)
      const cleanDefaults = assumptions.value.map(({ id: _id, ...rest }) => rest as any)
      await productStore.updateAssumptions(props.productId, cleanDefaults)
    }

    // Fetch revenue after data (and any seeding) is in place
    try {
      revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
    } catch {
      // Revenue may simply be empty on a new product — not an error
    }
  } finally {
    loading.value = false
  }
})

// ── Debounced save-then-refresh helpers ─────────────────────────────────────
// Each function saves the current local state to the API and, only after the
// save resolves, re-fetches the revenue summary.  Using a single chained
// async call avoids the race condition where a parallel refresh timer could
// fire before the save completes.

const debouncedSaveAssumptionsAndRefresh = debounce(async () => {
  const clean = assumptions.value.map(a => {
    const { id, ...rest } = a
    if (id && id.length === 36 && id.includes('-')) return a
    return rest as any
  })
  try {
    await productStore.updateAssumptions(props.productId, clean)
    revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
    await productStore.fetchConsolidated()
  } catch {
    // Silently ignore — user will see stale values until next successful save
  }
}, 600)

const debouncedSaveVolumesAndRefresh = debounce(async () => {
  const clean = volumes.value.map(v => {
    const { id, ...rest } = v
    if (id && id.length === 36 && id.includes('-')) return v
    return rest as any
  })
  try {
    await productStore.updateVolumes(props.productId, clean)
    revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
    await productStore.fetchConsolidated()
  } catch {}
}, 600)

const debouncedSaveMarginsAndRefresh = debounce(async () => {
  const clean = margins.value.map(m => {
    const { id, ...rest } = m
    if (id && id.length === 36 && id.includes('-')) return m
    return rest as any
  })
  try {
    await productStore.updateMargins(props.productId, clean)
    revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
    await productStore.fetchConsolidated()
  } catch {}
}, 600)

function handleAssumptionCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  const rowId = payload.rowId
  const yearIndex = payload.yearIndex
  const apiYearIndex = yearIndex + 1  // Backend uses 1-based yearIndex
  const value = payload.value

  // Determine which field was edited based on rowId
  let fieldName: keyof ProductAssumption = 'rawMaterialCost'
  if (rowId.includes('-rc-')) fieldName = 'royaltiesCost'
  else if (rowId.includes('-lc-')) fieldName = 'logisticsCost'
  else if (rowId.includes('-cc-')) fieldName = 'costCoefficient'
  else if (rowId.includes('-bup-')) fieldName = 'baseUnitPrice'
  else if (rowId.includes('-pc-')) fieldName = 'priceCoefficient'

  // Update local state
  let assumption = assumptions.value.find(
    (a) => a.productId === props.productId && a.yearIndex === apiYearIndex
  )
  if (!assumption) {
    assumption = {
      id: `${props.productId}-${apiYearIndex}`,
      productId: props.productId,
      yearIndex: apiYearIndex,
      rawMaterialCost: '0',
      royaltiesCost: '0',
      logisticsCost: '0',
      costCoefficient: '1',
      baseUnitPrice: '0',
      priceCoefficient: '1',
    }
    assumptions.value.push(assumption)
  }

  assumption[fieldName] = String(value)

  // Debounced: save full assumptions array, then refresh revenue
  debouncedSaveAssumptionsAndRefresh()
}

function handleVolumeCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  const rowId = payload.rowId
  const yearIndex = payload.yearIndex
  const apiYearIndex = yearIndex + 1  // Backend uses 1-based yearIndex
  const value = payload.value

  // Parse channel and zone from rowId: format is `${productId}-vol-${channel}-${zone}`
  const volSuffix = rowId.split('-vol-')[1] ?? ''
  const [channelKey, zoneKey] = volSuffix.split('-')

  // Update local state
  let volume = volumes.value.find(
    (v) =>
      v.productId === props.productId &&
      v.yearIndex === apiYearIndex &&
      v.channel === (channelKey as any) &&
      v.zone === (zoneKey as any)
  )
  if (!volume) {
    volume = {
      id: rowId,
      productId: props.productId,
      yearIndex: apiYearIndex,
      zone: zoneKey as any,
      channel: channelKey as any,
      unitsSold: 0,
    }
    volumes.value.push(volume)
  }

  volume.unitsSold = value

  // Debounced: save full volumes array, then refresh revenue
  debouncedSaveVolumesAndRefresh()
}

function handleMarginCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  const rowId = payload.rowId
  const yearIndex = payload.yearIndex
  const apiYearIndex = yearIndex + 1  // Backend uses 1-based yearIndex
  const value = payload.value

  // Parse zone from rowId: format is `${productId}-margin-${zone}`
  const zoneKey = rowId.split('-margin-')[1] ?? ''

  // Update local state
  let margin = margins.value.find(
    (m) =>
      m.productId === props.productId &&
      m.yearIndex === apiYearIndex &&
      m.zone === (zoneKey as any)
  )
  if (!margin) {
    margin = {
      id: rowId,
      productId: props.productId,
      yearIndex: apiYearIndex,
      zone: zoneKey as any,
      marginPercent: '0',
    }
    margins.value.push(margin)
  }

  margin.marginPercent = String(value)

  // Debounced: save full margins array, then refresh revenue
  debouncedSaveMarginsAndRefresh()
}

// ── DEV helpers (only compiled/shown in development mode) ───────────────────

/** Downloads the current revenue summary as a semicolon-delimited CSV. */
function downloadRevenueCSV() {
  const years = revenueSummary.value?.years
  if (!years?.length) return

  const sep = ';'
  const u = getUnitLabel()
  const headers = [
    'Year',
    `Turnover (${u})`,
    `COGS (${u})`,
    `Gross Margin (${u})`,
    'Gross Margin %',
    `Direct Sales (${u})`,
    `Indirect Sales (${u})`,
    `Europe & Export (${u})`,
    'Total Units',
    'Cumulative Units',
  ]

  const dataRows = years.map((y: any) => {
    const turnover         = Number(y.turnover         ?? 0)
    const directSalesTotal = Number(y.directSalesTotal ?? 0)
    const grossMarginPct   = (Number(y.grossMarginPct  ?? 0) * 100).toFixed(2)
    const displayUnit      = useDisplayUnitStore()
    const f                = displayUnit.factor
    return [
      y.yearIndex,
      (turnover / f).toFixed(3),
      (Number(y.cogs         ?? 0) / f).toFixed(3),
      (Number(y.grossMargin  ?? 0) / f).toFixed(3),
      grossMarginPct + '%',
      (directSalesTotal / f).toFixed(3),
      ((turnover - directSalesTotal) / f).toFixed(3),
      (Number(y.europeExportSales ?? 0) / f).toFixed(3),
      y.totalUnitSales,
      y.cumulatedUnitSales,
    ]
  })

  const csv = [headers, ...dataRows]
    .map(row => row.join(sep))
    .join('\r\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `revenue-${props.productId.slice(0, 8)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * DEV ONLY — seeds the product with a full realistic dataset (5 years of
 * assumptions, volumes for all zone × channel combos, distributor margins),
 * saves everything to the backend, re-fetches the revenue, then downloads
 * the result as a CSV.
 */
async function generateDevData() {
  devGenerating.value = true
  try {
    // ── Assumptions: 5-year ramp with cost structure ──────────────────────
    const devAssumptions = [1, 2, 3, 4, 5].map(y => ({
      productId:        props.productId,
      yearIndex:        y,
      rawMaterialCost:  String(50 + y * 5),          // 55 → 75 €/unit
      royaltiesCost:    '10',                          // stable
      logisticsCost:    '15',                          // stable
      costCoefficient:  '1.05',                        // +5% overhead
      baseUnitPrice:    String(250 + y * 25),          // 275 → 375 €/unit
      priceCoefficient: '1.0',                         // no extra markup
    }))

    // ── Volumes: 15% annual growth across all zone × channel combos ───────
    const baseUnits: Record<string, Record<string, number>> = {
      direct:   { france: 1000, europe: 400, export: 150 },
      indirect: { france:  600, europe: 250, export: 100 },
    }
    const devVolumes: any[] = []
    for (const ch of SALES_CHANNELS) {
      for (const zo of GEO_ZONES) {
        for (let y = 1; y <= MAX_YEARS; y++) {
          const growth = Math.pow(1.15, y - 1)
          devVolumes.push({
            productId: props.productId,
            yearIndex: y,
            zone:      zo.key,
            channel:   ch.key,
            unitsSold: Math.round(baseUnits[ch.key][zo.key] * growth),
          })
        }
      }
    }

    // ── Distributor margins: fixed per zone ───────────────────────────────
    const zoneMarginsMap: Record<string, string> = {
      france: '0.25',
      europe: '0.28',
      export: '0.30',
    }
    const devMargins: any[] = []
    for (const zo of GEO_ZONES) {
      for (let y = 1; y <= MAX_YEARS; y++) {
        devMargins.push({
          productId:     props.productId,
          yearIndex:     y,
          zone:          zo.key,
          marginPercent: zoneMarginsMap[zo.key],
        })
      }
    }

    // ── Persist to backend (sequential so revenue sees fresh data) ────────
    await productStore.updateAssumptions(props.productId, devAssumptions as any)
    await productStore.updateVolumes(props.productId, devVolumes)
    await productStore.updateMargins(props.productId, devMargins)

    // Sync local state so the grids refresh
    assumptions.value = devAssumptions.map((a, i) => ({ id: `dev-a-${i}`, ...a }))
    volumes.value     = devVolumes.map((v, i)    => ({ id: `dev-v-${i}`, ...v }))
    margins.value     = devMargins.map((m, i)    => ({ id: `dev-m-${i}`, ...m }))

    // ── Fetch & download revenue ──────────────────────────────────────────
    revenueSummary.value = await productStore.fetchRevenueByProduct(props.productId) || null
    downloadRevenueCSV()
  } finally {
    devGenerating.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-8">
    <ProgressSpinner />
  </div>
  <div v-else class="space-y-4">
    <!-- DEV-ONLY: seed full dataset + download revenue CSV -->
    <div v-if="isDev" class="flex justify-end">
      <button
        :disabled="devGenerating"
        class="dev-btn"
        @click="generateDevData"
      >
        <span class="dev-badge">DEV</span>
        {{ devGenerating ? 'Generating…' : '⚡ Generate & Download Revenue' }}
      </button>
    </div>

    <Tabs :value="activeTab" @update:value="(v: any) => activeTab = v">
      <TabList>
        <!-- Driver tab only shown for non-generic drivers -->
        <Tab v-if="isDriverManaged" value="driver">
          <span class="flex items-center gap-1">
            <i class="pi pi-cog text-blue-600" style="font-size:0.8rem"></i>
            Driver Config
          </span>
        </Tab>
        <Tab value="assumptions">{{ units.assumptionsTab }}</Tab>
        <Tab v-if="!isContract" value="volumes">{{ units.volumesTab }}</Tab>
        <Tab v-if="hasIndirectSales" value="margins">{{ isService ? 'Partner Margins' : 'Distributor Margins' }}</Tab>
        <Tab value="revenue">Revenue Summary</Tab>
      </TabList>
      <TabPanels>
        <!-- ── Driver Configuration tab ────────────────────────────────────── -->
        <TabPanel v-if="isDriverManaged" value="driver">
          <div class="mt-4 space-y-4">
            <!-- Saving / error feedback -->
            <div v-if="driverSaving" class="flex items-center gap-2 text-xs text-blue-600">
              <i class="pi pi-spin pi-spinner"></i> Saving driver configuration…
            </div>
            <div v-if="driverError" class="text-xs text-red-500 bg-red-50 border border-red-200 rounded-sm p-2">
              {{ driverError }}
            </div>
            <DriverParamsForm
              :driver-type="localDriverType"
              :model-value="localDriverParams"
              @update:model-value="handleDriverParamsChange"
            />
          </div>
        </TabPanel>

        <!-- ── Key Assumptions / Day Rate & Cost tab ──────────────────────── -->
        <TabPanel value="assumptions">
          <div class="mt-4">
            <!-- Unit reminder -->
            <div class="flex justify-end mb-2">
              <span class="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-sm px-2 py-0.5 font-medium">
                Prices in €/{{ units.per }}
              </span>
            </div>

            <!-- Driver-managed: show read-only derived assumptions -->
            <template v-if="isDriverManaged">
              <div class="mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-sm px-3 py-2">
                <i class="pi pi-info-circle"></i>
                Unit economics are computed by the <strong>{{ currentProduct?.driverType }}</strong> driver.
                Edit parameters in the <strong>Driver Config</strong> tab.
                <span v-if="currentProduct?.driverType === 'consulting'" class="ml-1">The billing day rate is still editable below.</span>
              </div>
              <KYearGrid
                v-if="derivedAssumptionsGridRows.length > 0"
                :rows="derivedAssumptionsGridRows"
              />
              <div v-else class="text-xs text-gray-400 italic py-4">
                No derived data yet — configure driver parameters in the Driver Config tab.
              </div>
              <!-- For consulting: billing rate remains user-editable (stored BaseUnitPrice) -->
              <template v-if="currentProduct?.driverType === 'consulting'">
                <div class="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-sm text-xs text-amber-800">
                  <strong>Billing Day Rate</strong> is market-determined and still editable below.
                </div>
                <KYearGrid
                  :rows="assumptionsGridRows.filter(r => r.id.includes('-bup-'))"
                  @cell-edit="handleAssumptionCellEdit"
                />
              </template>
            </template>

            <!-- Generic: show fully editable assumptions -->
            <KYearGrid
              v-else
              :rows="assumptionsGridRows"
              @cell-edit="handleAssumptionCellEdit"
            />
          </div>
        </TabPanel>

        <!-- ── Sales Volumes / Billable Days tab ──────────────────────────── -->
        <TabPanel v-if="!isContract" value="volumes">
          <div class="mt-4">
            <!-- Driver-managed (non-industry): show computed read-only volumes -->
            <template v-if="isDriverManaged && currentProduct?.driverType !== 'industry'">
              <div class="mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-sm px-3 py-2">
                <i class="pi pi-info-circle"></i>
                Volumes are derived from the <strong>{{ currentProduct?.driverType }}</strong> driver parameters.
              </div>
              <KYearGrid
                v-if="derivedVolumesGridRows.length > 0"
                :rows="derivedVolumesGridRows"
              />
              <div v-else class="text-xs text-gray-400 italic py-4">
                No derived volumes yet — configure driver parameters in the Driver Config tab.
              </div>
            </template>

            <!-- Industry or generic: volumes are still manually editable -->
            <template v-else>
              <div
                v-if="currentProduct?.driverType === 'industry'"
                class="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2"
              >
                <i class="pi pi-info-circle"></i>
                Industry driver uses your sales volumes below and adjusts the unit cost (scrap + setup).
              </div>
              <KYearGrid
                :rows="volumesGridRows"
                :groupBy="true"
                @cell-edit="handleVolumeCellEdit"
              />
            </template>
          </div>
        </TabPanel>

        <TabPanel v-if="hasIndirectSales" value="margins">
          <div class="mt-4">
            <KYearGrid
              :rows="marginsGridRows"
              @cell-edit="handleMarginCellEdit"
            />
          </div>
        </TabPanel>

        <TabPanel value="revenue">
          <div class="mt-4">
            <div class="flex justify-end mb-1">
              <span class="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-sm px-2 py-0.5 font-medium">
                Amounts in {{ unitLabel }}
              </span>
            </div>
            <DataTable
              v-if="revenueSummaryRows.length > 0"
              :value="revenueSummaryRows"
              class="p-datatable-sm p-datatable-gridlines"
              :scrollable="true"
              scrollHeight="flex"
              showGridlines
              size="small"
            >
              <Column field="yearIndex" header="Year" />

              <!-- Total Turnover + trend -->
              <Column field="totalTurnover" header="Total Turnover" class="text-right">
                <template #body="{ data }">
                  <div class="cell-with-trend">
                    <span>{{ data.totalTurnover }}</span>
                    <span v-if="data.trendTurnover" :class="trendClass(data.trendTurnover.direction)" class="trend-badge">
                      {{ trendIcon(data.trendTurnover.direction) }}&nbsp;{{ data.trendTurnover.pct }}&nbsp;%
                    </span>
                  </div>
                </template>
              </Column>

              <Column field="totalCOGS" header="Total COGS" class="text-right" />
              <Column field="grossMargin" header="Gross Margin" class="text-right" />

              <!-- Gross Margin % + trend -->
              <Column field="grossMarginPct" header="Gross Margin %" class="text-right">
                <template #body="{ data }">
                  <div class="cell-with-trend">
                    <span>{{ data.grossMarginPct }}</span>
                    <span v-if="data.trendMarginPct" :class="trendClass(data.trendMarginPct.direction)" class="trend-badge">
                      {{ trendIcon(data.trendMarginPct.direction) }}&nbsp;{{ data.trendMarginPct.pct }}&nbsp;%
                    </span>
                  </div>
                </template>
              </Column>

              <Column field="directSales" header="Direct Sales" class="text-right" />
              <Column field="indirectSales" header="Indirect Sales" class="text-right" />
              <Column field="europeExportSales" header="Europe/Export Sales" class="text-right" />

              <!-- Total volume (units / days) + trend -->
              <Column field="totalUnitSales" :header="`Total ${units.heading}`" class="text-right">
                <template #body="{ data }">
                  <div class="cell-with-trend">
                    <span>{{ data.totalUnitSales }}</span>
                    <span v-if="data.trendUnits" :class="trendClass(data.trendUnits.direction)" class="trend-badge">
                      {{ trendIcon(data.trendUnits.direction) }}&nbsp;{{ data.trendUnits.pct }}&nbsp;%
                    </span>
                  </div>
                </template>
              </Column>

              <Column field="cumulativeUnitSales" :header="`Cumul. ${units.heading}`" class="text-right" />
            </DataTable>
            <div v-else class="text-gray-500">No revenue data available</div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
:deep(.p-datatable) {
  font-size: 0.875rem;
}

:deep(.cell-input) {
  background-color: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
}

:deep(.cell-computed) {
  background-color: #f3f4f6;
  color: #6b7280;
}

:deep(.row-aggregate) {
  font-weight: 700;
  background-color: #fef3c7;
}

:deep(.row-subtotal) {
  font-weight: 600;
  background-color: #fce7f3;
}

/* ── Trend indicators ──────────────────────────────────────────────────────── */
:deep(.cell-with-trend) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

:deep(.trend-badge) {
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

:deep(.trend-up)     { color: #15803d; background-color: #dcfce7; }
:deep(.trend-down)   { color: #b91c1c; background-color: #fee2e2; }
:deep(.trend-stable) { color: #6b7280; background-color: #f3f4f6; }

/* ── DEV button ─────────────────────────────────────────────────────────── */
.dev-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  background: #fffbeb;
  border: 1.5px dashed #f59e0b;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.dev-btn:hover:not(:disabled) { background: #fef3c7; }
.dev-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.dev-badge {
  padding: 0 0.3rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  background: #f59e0b;
  border-radius: 3px;
}
</style>
