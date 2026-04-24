<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useCapexStore } from '@/features/capex/stores/capexStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDecimal } from '@/composables/useDecimal'
import { ASSET_CATEGORIES, MAX_YEARS, DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import type { GridRow } from '@/components/common/KYearGrid.vue'
import type { CapexEntry } from '@/types'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import KYearGrid from '@/components/common/KYearGrid.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

defineProps<{ planId?: string; sid?: string }>()

const isDev = import.meta.env.DEV

// ── DEV ONLY: sample data seeder ─────────────────────────────────────────────
const devLoading = ref(false)

// Realistic capex for a growing SaaS startup (k€, yearIndex 1–5)
// yearIndex is 1-based in the CAPEX module (compute validates 1 ≤ yearIndex ≤ MaxYears)
const DEV_CAPEX: Record<string, number[]> = {
  // Non-depreciable
  land:                 [  0,   0,   0,   0,   0],
  intangible_business:  [  0,   0,   0,   0,   0],
  financial:            [  0,   0,   0,   0,   0],
  // Depreciable — intangible
  buildings:            [  0,   0,   0,   0,   0],
  setup_expenses:       [ 40,   0,   0,   0,   0],  // one-off legal/admin Y1
  patents_trademarks:   [ 30,  20,   0,   0,   0],  // IP registration early years
  rnd_expenses:         [100, 150, 200, 150, 100],  // core R&D spend
  other_intangible:     [ 10,  10,  15,  15,  15],  // software licences / misc
  // Depreciable — tangible
  prototypes:           [  0,  60,  80,  50,   0],  // product dev iterations
  equipment_tools:      [ 20,  30,  30,  40,  40],  // lab / production equipment
  office_furniture:     [ 15,  20,  25,  30,  35],  // grows with headcount
  computer_hw_sw:       [ 40,  55,  70,  85,  90],  // grows with headcount
  vehicles:             [  0,  20,   0,  20,   0],  // fleet refresh every 2 years
  other_tangible:       [ 10,  10,  15,  15,  20],  // misc fixtures
}

function downloadResults() {
  const data = {
    entries: capexStore.entries,
    summary: capexStore.summary,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'capex-results.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function fillSampleData() {
  devLoading.value = true
  try {
    const payload = ASSET_CATEGORIES.flatMap(cat =>
      Array.from({ length: MAX_YEARS }, (_, i) => ({
        category: cat.key as any,
        yearIndex: i + 1,                          // 1-based to match backend compute contract
        amount: String(DEV_CAPEX[cat.key]?.[i] ?? 0),
        depreciationYears: cat.defaultLife,
        isManualOverride: false,
      }))
    )
    await capexStore.updateEntries(payload)
    await capexStore.fetchSummary()
  } finally {
    devLoading.value = false
  }
}

const capexStore = useCapexStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { getUnitLabel } = useDecimal()
const unitLabel = computed(() => getUnitLabel())

// ── Row tooltips ──────────────────────────────────────────────────────────────
// Shown as an ℹ info icon next to each row label in KYearGrid.
const CAPEX_TOOLTIPS: Record<string, string> = {
  land:                 'Land purchases or site acquisition costs. Not depreciable — its value remains on the balance sheet indefinitely.',
  intangible_business:  'Goodwill or intangible value from a business acquisition. Not depreciable under most accounting frameworks.',
  buildings:            'Construction, purchase, or major renovation of buildings. Depreciated straight-line over 10 years.',
  setup_expenses:       'One-off costs to legally establish and set up the company (legal fees, registration, notary). Depreciated over 5 years.',
  patents_trademarks:   'Filing costs and purchase price for patents, trademarks, or other registered intellectual property. Depreciated over 20 years.',
  rnd_expenses:         'Capitalised R&D costs meeting the criteria for balance-sheet recognition (e.g. IFRS development phase). Depreciated over 4 years.',
  other_intangible:     'Other intangible assets not covered above — e.g. software licences, concessions, or purchased user databases. Depreciated over 4 years.',
  prototypes:           'Physical or digital prototypes built during the product development phase. Depreciated over 5 years.',
  equipment_tools:      'Manufacturing, lab, or production equipment and specialised tools. Depreciated over 5 years.',
  office_furniture:     'Desks, chairs, and other office furnishings. Grows in line with headcount. Depreciated over 5 years.',
  computer_hw_sw:       'Laptops, servers, and bundled software licences. Typically grows with headcount. Depreciated over 3 years.',
  vehicles:             'Company cars, vans, or delivery vehicles. Depreciated over 5 years.',
  other_tangible:       'Other physical assets not covered above — e.g. fixtures, signage, or security systems. Depreciated over 4 years.',
  financial:            'Long-term financial investments such as equity stakes, loans to subsidiaries, or security deposits. Not depreciable.',
}

// Data for investment grid
const investmentRows = computed<GridRow[]>(() => {
  return ASSET_CATEGORIES.map(cat => {
    const entries = capexStore.entries.filter(e => e.category === cat.key)
    const values = Array.from({ length: MAX_YEARS }, (_, i) =>
      entries.find(e => e.yearIndex === i + 1)?.amount || '0'
    )
    return {
      id: `capex-${cat.key}`,
      label: cat.label,
      values,
      editable: true,
      decimals: 0,
      tooltip: CAPEX_TOOLTIPS[cat.key],
    }
  })
})

// Depreciation years per category
const depreciationTable = computed(() => {
  return ASSET_CATEGORIES.map(cat => {
    const entry = capexStore.entries.find(e => e.category === cat.key && e.yearIndex === 1)
    const depYears = entry?.depreciationYears || cat.defaultLife
    const depLabel = cat.depreciable ? String(depYears) : 'N/A'
    return {
      category: cat.label,
      depreciationYears: depLabel,
    }
  })
})

// Summary rows from capex summary
const summaryRows = computed<GridRow[]>(() => {
  const totals = capexStore.summary?.totals
  if (!totals) return []

  return [
    {
      id: 'summary-capex',
      label: 'Total Capex',
      values: totals.totalCapex,          // [5] — one per forecast year
      editable: false,
      isComputed: true,
      decimals: 0,
      tooltip: 'Sum of all capital expenditures across every asset category for each forecast year.',
    },
    {
      id: 'summary-depreciation',
      label: 'Total Depreciation',
      values: totals.totalDepreciation,   // [5]
      editable: false,
      isComputed: true,
      decimals: 0,
      tooltip: 'Annual depreciation charge across all depreciable assets, computed using straight-line depreciation over each asset\'s useful life. Non-depreciable assets (Land, Goodwill, Financial) contribute zero.',
    },
    {
      id: 'summary-net-assets',
      label: 'Net Assets (end of year)',
      values: totals.netAssets.slice(1),  // [6] → drop index 0 (previous year opening)
      editable: false,
      isComputed: true,
      isAggregate: true,
      decimals: 0,
      tooltip: 'Cumulative net book value of all assets at year-end: prior year net assets + new capex − annual depreciation. Feeds directly into the Balance Sheet.',
    },
  ] as GridRow[]
})

// Debounced update
const debouncedUpdateCapex = debounce(async (data: Partial<CapexEntry>[]) => {
  await capexStore.updateEntries(data)
  capexStore.fetchSummary(true).catch(() => {})
}, DEBOUNCE_MS)

// Cell edit handler
const handleCapexEdit = async (payload: { rowId: string; yearIndex: number; value: number }) => {
  const catKey = payload.rowId.replace('capex-', '')
  // The grid emits 0-based yearIndex (0–4); the backend compute expects 1-based (1–5).
  const yearIndex = payload.yearIndex + 1
  const existing = capexStore.entries.find(
    e => e.category === catKey && e.yearIndex === yearIndex
  )
  const asset = ASSET_CATEGORIES.find(a => a.key === catKey)
  const depYears = asset?.defaultLife || 0
  const updateData = existing
    ? [{ ...existing, amount: String(payload.value) }]
    : [{
        category: catKey as any,
        yearIndex,
        amount: String(payload.value),
        depreciationYears: depYears,
        isManualOverride: false,
      }]
  await debouncedUpdateCapex(updateData)
}

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await capexStore.fetchAll()
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Capital Expenditure</h1>
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
          :disabled="!capexStore.summary"
          @click="downloadResults"
        />
      </div>
    </div>
    <KFormLegend
      variant="grid"
      description="Enter planned capital expenditures per asset category per year (in thousands). Depreciation is automatically computed based on each asset's useful life. Non-depreciable assets (land, financial) never depreciate."
      :extras="[{ icon: 'pi-wrench', text: 'Depreciation life in years is set per asset category in the backend configuration' }]"
    />

    <div v-if="capexStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else class="space-y-8">
      <!-- Investment Grid Section -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Investment Grid</h2>
        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Depreciation Schedule</h3>
          <DataTable
            :value="depreciationTable"
            class="p-datatable-sm mb-4"
            showGridlines
            size="small"
          >
            <Column field="category" header="Asset Category" />
            <Column field="depreciationYears" header="Depreciation Years" />
          </DataTable>
        </div>
        <KYearGrid
          :rows="investmentRows"
          :unit="unitLabel"
          @cell-edit="handleCapexEdit"
        />
        <p class="text-sm text-gray-600 mt-4">
          Enter investment amounts by asset category and year. Non-depreciable assets (Land, Goodwill, Financial Assets) show N/A for depreciation.
        </p>
      </div>

      <!-- Depreciation Summary Section -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Depreciation Summary</h2>
        <KYearGrid
          v-if="summaryRows.length > 0"
          :rows="summaryRows"
          :unit="unitLabel"
          :show-total="false"
        />
        <div v-else class="text-gray-500 py-4">
          No depreciation summary data available yet.
        </div>
      </div>
    </div>
  </div>
</template>
