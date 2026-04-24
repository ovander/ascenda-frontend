<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useOpexStore } from '@/features/opex/stores/opexStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { MAX_YEARS, DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import type { GridRow } from '@/components/common/KYearGrid.vue'
import type { OpexManualEntry } from '@/types'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { Bar } from 'vue-chartjs'
import '@/plugins/chartjs'
import KYearGrid from '@/components/common/KYearGrid.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

defineProps<{ planId?: string; sid?: string }>()

const isDev = import.meta.env.DEV

// ── Display labels ────────────────────────────────────────────────────────────
const LINE_LABELS: Record<string, string> = {
  property_rentals:       'Property Rentals',
  postage_telecom:        'Postage & Telecom',
  supplies_purchases:     'Supplies & Purchases',
  studies_documentation:  'Studies & Documentation',
  insurance_costs:        'Insurance Costs',
  leasing_movable:        'Leasing (Movable)',
  leasing_real_estate:    'Leasing (Real Estate)',
  maintenance_repairs:    'Maintenance & Repairs',
  professional_fees:      'Professional Fees',
  external_staff_rnd:     'External Staff (R&D)',
  royalty_patents:        'Royalty – Patents',
  royalty_trademarks:     'Royalty – Trademarks',
  travel_transport:       'Travel & Transport',
  mission_representation: 'Mission & Representation',
  design_creation:        'Design & Creation',
  advertising_comms:      'Advertising & Communications',
  trade_shows:            'Trade Shows',
  tech_costs_web:         'Tech Costs & Web Hosting',
  promotion_merchandising:'Promotion & Merchandising',
  recruitment_training:   'Recruitment & Training',
  other_expenses:         'Other Expenses',
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  premises:     'Premises & Services',
  leasing:      'Leasing',
  professional: 'Professional Services',
  royalties:    'Royalties',
  travel:       'Travel & Representation',
  marketing:    'Marketing & Communication',
  hr:           'HR & Admin',
}

// ── Row tooltips ──────────────────────────────────────────────────────────────
// Shown as an ℹ info icon next to each row label in KYearGrid.
const LINE_TOOLTIPS: Record<string, string> = {
  // Premises & Services — formula-driven
  property_rentals:       'Office and workspace rental costs. Computed automatically from headcount using the per-employee premises cost defined in Settings. Read-only.',
  postage_telecom:        'Postage, telephone, and internet charges. Computed from headcount using the per-employee telecom cost in Settings. Read-only.',
  supplies_purchases:     'Consumables, office supplies, and small purchases. Computed from headcount using the per-employee supplies cost in Settings. Read-only.',
  studies_documentation:  'External studies, subscriptions, technical documentation, and databases. Computed from headcount via Settings. Read-only.',
  insurance_costs:        'Business liability, property, and cyber insurance premiums. Computed from headcount via Settings. Read-only.',
  // Leasing — manual
  leasing_movable:        'Lease payments for movable assets — machinery, vehicles, or equipment under operating leases (not purchased as Capex). Enter your planned annual budget.',
  leasing_real_estate:    'Lease payments for offices, warehouses, or other real estate under operating leases. Enter your planned annual budget.',
  // Professional Services — manual / formula
  maintenance_repairs:    'Upkeep and repair contracts for equipment, IT systems, and facilities. Enter your planned annual budget.',
  professional_fees:      'Fees for external advisors — lawyers, accountants, auditors, and management consultants. Enter your planned annual budget.',
  external_staff_rnd:     'Freelancers, sub-contractors, and interim staff assigned to R&D projects. Enter your planned annual budget.',
  // Royalties — mixed
  royalty_patents:        'Royalty payments due on patents held by third parties. Computed automatically from revenue or usage metrics via Settings. Read-only.',
  royalty_trademarks:     'Royalty payments for licensed trademarks or brands. Enter your planned annual budget.',
  // Travel & Representation — formula-driven
  travel_transport:       'Staff travel costs — flights, trains, taxis, and mileage reimbursements. Computed from headcount using the per-employee travel cost in Settings. Read-only.',
  mission_representation: 'Client entertainment, business meals, gifts, and hospitality. Computed from headcount via Settings. Read-only.',
  // Marketing & Communication — manual
  design_creation:        'Graphic design, UX/UI work, video production, and creative agency fees. Enter your planned annual budget.',
  advertising_comms:      'Paid advertising — digital ads, PR agency fees, and media placements. Enter your planned annual budget.',
  trade_shows:            'Exhibition stands, registration fees, and logistics for trade shows and conferences. Enter your planned annual budget.',
  tech_costs_web:         'SaaS tools, cloud hosting, CDN, and other digital infrastructure costs (operational, not capitalised). Enter your planned annual budget.',
  promotion_merchandising:'Promotional materials, branded merchandise, and product sampling costs. Enter your planned annual budget.',
  // HR & Admin
  recruitment_training:   'Recruitment agency fees, job board subscriptions, and employee training budgets. Computed from headcount via Settings. Read-only.',
  other_expenses:         'Miscellaneous operating expenses not covered by the categories above. Enter your planned annual budget.',
}

const SUBTOTAL_TOOLTIPS: Record<string, string> = {
  premises:     'Sum of all Premises & Services lines: rentals, telecom, supplies, studies, and insurance.',
  leasing:      'Sum of movable and real estate lease payments for the year.',
  professional: 'Sum of maintenance, professional fees, and external R&D staffing costs.',
  royalties:    'Sum of patent and trademark royalty payments for the year.',
  travel:       'Sum of travel & transport and mission/representation costs.',
  marketing:    'Sum of all Marketing & Communication lines: design, advertising, trade shows, web tech, and promotion.',
  hr:           'Sum of recruitment, training, and other administrative expenses.',
}

// ── DEV ONLY: sample data seeder ─────────────────────────────────────────────
const devLoading = ref(false)

// Realistic OPEX for a growing SaaS startup (k€, yearIndex 0–4)
// Only the 12 manual (IsUserInput: true) lines need seeding.
const DEV_OPEX: Record<string, number[]> = {
  leasing_movable:         [ 20,  25,  30,  35,  40],  // equipment leasing
  leasing_real_estate:     [ 60,  72,  84,  96, 108],  // office rent growth
  maintenance_repairs:     [ 10,  12,  15,  18,  20],
  professional_fees:       [ 50,  60,  70,  80,  90],  // legal, accounting
  external_staff_rnd:      [ 80, 100, 120, 100,  80],  // freelance R&D
  royalty_trademarks:      [  5,   5,  10,  10,  15],
  design_creation:         [ 15,  20,  25,  30,  35],
  advertising_comms:       [ 30,  50,  70,  90, 110],  // grows with sales push
  trade_shows:             [ 10,  15,  20,  25,  30],
  tech_costs_web:          [ 20,  25,  35,  45,  55],  // SaaS infra costs
  promotion_merchandising: [  5,  10,  15,  20,  25],
  other_expenses:          [  8,  10,  12,  14,  16],
}

function downloadResults() {
  const data = {
    manualEntries: opexStore.manualEntries,
    summary: opexStore.summary,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'opex-results.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function fillSampleData() {
  devLoading.value = true
  try {
    const payload: Partial<OpexManualEntry>[] = []
    for (const [lineId, yearValues] of Object.entries(DEV_OPEX)) {
      for (let i = 0; i < MAX_YEARS; i++) {
        payload.push({
          lineId,
          yearIndex: i + 1,  // 1-based to match backend compute contract
          amount: String(yearValues[i] ?? 0),
        })
      }
    }
    await opexStore.updateManualEntries(payload)
  } finally {
    devLoading.value = false
  }
}

// ── Stores & composables ──────────────────────────────────────────────────────
const opexStore = useOpexStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { yearHeaders } = useYearHeaders()
const { getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())

// ── Build grouped rows from opex summary (array-based) ───────────────────────
const opexRows = computed<GridRow[]>(() => {
  if (!opexStore.summary) return []

  const allRows: GridRow[] = []

  for (const subcatResult of opexStore.summary.subcategories) {
    const subcatKey = subcatResult.subcategory
    const subcatLabel = SUBCATEGORY_LABELS[subcatKey] ?? subcatKey

    // Add each line row
    for (const line of subcatResult.lines) {
      const isComputed = !line.isUserInput
      allRows.push({
        id: line.lineId,
        label: LINE_LABELS[line.lineId] ?? line.lineId,
        values: line.years,
        editable: !isComputed,
        isComputed,
        decimals: 0,
        group: subcatLabel,
        suffix: isComputed ? ' [formula]' : undefined,
        tooltip: LINE_TOOLTIPS[line.lineId],
      })
    }

    // Subtotal row for this subcategory (from backend)
    allRows.push({
      id: `subtotal-${subcatKey}`,
      label: `Subtotal – ${subcatLabel}`,
      values: subcatResult.subtotal,
      editable: false,
      isComputed: true,
      isSubtotal: true,
      decimals: 0,
      group: subcatLabel,
      tooltip: SUBTOTAL_TOOLTIPS[subcatKey],
    })
  }

  // Grand total
  allRows.push({
    id: 'opex-grand-total',
    label: 'GRAND TOTAL OPEX',
    values: opexStore.summary.grandTotal,
    editable: false,
    isComputed: true,
    isAggregate: true,
    decimals: 0,
    tooltip: 'Total operating expenses across all categories and subcategories for each forecast year. Feeds directly into the P&L.',
  })

  return allRows
})

// ── Debounced update ──────────────────────────────────────────────────────────
const debouncedUpdateOpex = debounce(async (data: Partial<OpexManualEntry>[]) => {
  await opexStore.updateManualEntries(data)
}, DEBOUNCE_MS)

// ── Cell edit handler ─────────────────────────────────────────────────────────
const handleOpexEdit = async (payload: { rowId: string; yearIndex: number; value: number }) => {
  const lineId = payload.rowId
  // The grid emits 0-based yearIndex (0–4); the backend compute expects 1-based (1–5).
  const yearIndex = payload.yearIndex + 1
  const existing = opexStore.manualEntries.find(
    e => e.lineId === lineId && e.yearIndex === yearIndex
  )
  const updateData: Partial<OpexManualEntry>[] = existing
    ? [{ ...existing, amount: String(payload.value) }]
    : [{ lineId, yearIndex, amount: String(payload.value) }]
  await debouncedUpdateOpex(updateData)
}

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await opexStore.fetchAll()
  }
})

// ── OPEX Composition Waterfall ────────────────────────────────────────────────
const opexWfYearIndex = ref(0)  // 0-based index into the 5-element summary arrays

const opexWfYearOptions = computed(() =>
  yearHeaders.value.map((h, i) => ({ label: h, value: i })),
)

const opexWaterfallData = computed<any>(() => {
  const s = opexStore.summary
  if (!s) return null
  const i = opexWfYearIndex.value
  const factor = displayUnitStore.factor  // reactive: 1 | 1_000 | 1_000_000

  const C_BAR = 'rgba(239,68,68,0.72)';   const CB_BAR = 'rgb(220,38,38)'
  const C_SUB = 'rgba(99,102,241,0.85)';  const CB_SUB = 'rgb(79,70,229)'

  const labels: string[] = []
  const data:   [number, number][] = []
  const bgColors:     string[] = []
  const borderColors: string[] = []

  let cursor = 0
  for (const subcat of s.subcategories) {
    const subtotal = (parseFloat((subcat.subtotal ?? [])[i] ?? '0') || 0) / factor
    if (subtotal === 0) continue
    const label = SUBCATEGORY_LABELS[subcat.subcategory] ?? subcat.subcategory
    labels.push(label)
    data.push([cursor, cursor + subtotal])
    bgColors.push(C_BAR)
    borderColors.push(CB_BAR)
    cursor += subtotal
  }

  // Grand total anchor bar
  const grand = (parseFloat((s.grandTotal ?? [])[i] ?? '0') || 0) / factor
  labels.push('Total OPEX')
  data.push([0, grand])
  bgColors.push(C_SUB)
  borderColors.push(CB_SUB)

  return {
    labels,
    datasets: [{
      label: unitLabel.value,
      data,
      backgroundColor: bgColors,
      borderColor: borderColors,
      borderWidth: 1.5,
      borderSkipped: false,
    }],
  }
})

const opexWfOptions = computed<any>(() => {
  const unit = unitLabel.value  // read here so computed is reactive to unit changes
  const decimals = displayUnitStore.decimals
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const raw = ctx.raw
            const val = Array.isArray(raw) ? raw[1] - raw[0] : Number(raw)
            return `${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          callback: (v: any) =>
            Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
        },
      },
    },
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Operating Expenses</h1>
      <div v-if="isDev" class="flex gap-2">
        <Button
          label="Fill Sample Data"
          icon="pi pi-bolt"
          size="small"
          severity="secondary"
          :loading="devLoading"
          @click="fillSampleData"
        />
        <Button
          label="Download Results"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          :disabled="!opexStore.summary"
          @click="downloadResults"
        />
      </div>
    </div>
    <KFormLegend
      variant="grid"
      description="Enter operating expenses per line item per year (in thousands). Orange rows are manual entries. Formula-driven rows (marked [formula]) are computed automatically from headcount and the per-hire parameters in Settings."
      :extras="[{ icon: 'pi-tag', text: 'Rows marked [formula] are read-only — adjust them via OPEX Parameters in Settings' }]"
    />

    <Tabs value="grid" class="w-full">
      <TabList>
        <Tab value="grid">Grid</Tab>
        <Tab value="graphs">Graphs</Tab>
      </TabList>
      <TabPanels>

        <!-- Grid tab -->
        <TabPanel value="grid" class="p-0 pt-4">
          <div v-if="opexStore.loading" class="flex justify-center py-12">
            <ProgressSpinner />
          </div>
          <div v-else class="space-y-4">
            <KYearGrid
              v-if="opexRows.length > 0"
              :rows="opexRows"
              :unit="unitLabel"
              :group-by="true"
              @cell-edit="handleOpexEdit"
            />
            <div v-else class="text-gray-500 py-4">
              No OPEX data available yet.
            </div>
            <p class="text-sm text-gray-600 mt-6">
              Editable rows are manual entries. Rows marked [formula] are computed based on cost driver formulas (per capita, % of sales, etc.).
              Subtotals are calculated automatically per subcategory.
            </p>
          </div>
        </TabPanel>

        <!-- Graphs tab -->
        <TabPanel value="graphs" class="p-0 pt-4">
          <div class="flex flex-col gap-6">

            <!-- OPEX Composition Waterfall -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-1">
                <h2 class="text-lg font-semibold text-gray-700">OPEX Composition</h2>
                <Select
                  v-model="opexWfYearIndex"
                  :options="opexWfYearOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select year"
                  class="w-36"
                  size="small"
                />
              </div>
              <p class="text-xs text-gray-400 mb-3">
                How each cost category stacks up to total OPEX for the selected year.
              </p>
              <div class="flex items-center gap-5 mb-3 text-xs text-gray-500">
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Cost category</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Total OPEX</span>
              </div>
              <div v-if="opexStore.loading" class="flex justify-center py-10">
                <ProgressSpinner style="width:40px;height:40px" />
              </div>
              <div v-else-if="!opexWaterfallData" class="flex justify-center py-10 text-gray-400 text-sm">
                No data available yet.
              </div>
              <div v-else style="height: 360px; position: relative">
                <Bar :key="unitLabel" :data="opexWaterfallData" :options="opexWfOptions" />
              </div>
            </div>

          </div>
        </TabPanel>

      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
:deep(.cell-computed) {
  background-color: #dcfce7; /* green-100 */
}

:deep(.cell-input) {
  background-color: #fed7aa; /* orange-100 */
}

:deep(.row-subtotal) {
  background-color: #f3f4f6; /* gray-100 */
  font-weight: 600;
}

:deep(.row-aggregate) {
  background-color: #e5e7eb; /* gray-200 */
  font-weight: bold;
}
</style>
