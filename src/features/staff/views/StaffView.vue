<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useStaffStore } from '@/features/staff/stores/staffStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { STAFF_CATEGORIES, MAX_YEARS, DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import type { GridRow } from '@/components/common/KYearGrid.vue'
import type { StaffHeadcount, StaffSalary, StaffIncentive } from '@/types'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import KYearGrid from '@/components/common/KYearGrid.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import KChart from '@/components/common/KChart.vue'
import KSaveBanner from '@/components/KSaveBanner.vue'
import type { ChartData } from '@/types'

defineProps<{ planId?: string; sid?: string }>()

const isDev = import.meta.env.DEV

// ── DEV ONLY: sample data seeder ─────────────────────────────────────────────
const devLoading = ref(false)

// Realistic FTE values for a growing SaaS startup (Y1→Y5, yearIndex 0..4)
const DEV_HEADCOUNTS: Record<string, number[]> = {
  rnd_engineers:      [2, 3, 4,  5,  6],
  prod_engineers:     [1, 1, 2,  2,  3],
  prod_technicians:   [1, 2, 2,  3,  4],
  sales_team:         [2, 3, 4,  5,  6],
  marketing_team:     [1, 1, 2,  2,  3],
  admin_managers:     [1, 1, 1,  2,  2],
  admin_assistants:   [1, 1, 2,  2,  3],
  executive_team:     [2, 2, 3,  3,  3],
}

// Monthly gross salary per category (€, constant across years for simplicity)
const DEV_SALARIES: Record<string, number> = {
  rnd_engineers:    5_000,
  prod_engineers:   4_500,
  prod_technicians: 3_000,
  sales_team:       4_000,
  marketing_team:   4_000,
  admin_managers:   3_500,
  admin_assistants: 2_500,
  executive_team:   8_000,
}

// Incentive % stored as decimal fraction (0.10 = 10%) and specific incentives per year (yearIndex 1..5)
const DEV_INCENTIVE_PCT      = [0.10, 0.10, 0.12, 0.12, 0.15]
const DEV_INCENTIVE_SPECIFIC = [0,    0,    5_000, 5_000, 10_000]

async function fillSampleData() {
  devLoading.value = true
  try {
    // 1. Headcounts (yearIndex 1–5 matching DB/compute convention)
    const headcountPayload = STAFF_CATEGORIES.flatMap(cat =>
      DEV_HEADCOUNTS[cat.key].map((fte, i) => ({
        category: cat.key as any,
        yearIndex: i + 1,
        fte: String(fte),
      }))
    )
    await staffStore.updateHeadcounts(headcountPayload)

    // 2. Salaries (same value each year)
    const salaryPayload = STAFF_CATEGORIES.flatMap(cat =>
      Array.from({ length: MAX_YEARS }, (_, i) => ({
        category: cat.key as any,
        yearIndex: i + 1,
        monthlyGrossSalary: String(DEV_SALARIES[cat.key]),
        annualIncreasePct: '0',
      }))
    )
    await staffStore.updateSalaries(salaryPayload)

    // 3. Incentives
    const incentivePayload = Array.from({ length: MAX_YEARS }, (_, i) => ({
      yearIndex: i + 1,
      incentivePct: String(DEV_INCENTIVE_PCT[i]),
      specificIncentives: String(DEV_INCENTIVE_SPECIFIC[i]),
    }))
    await staffStore.updateIncentives(incentivePayload)

    // Refresh payroll summary
    await staffStore.fetchPayrollSummary()
  } finally {
    devLoading.value = false
  }
}

function downloadResults() {
  const summary = staffStore.payrollSummary
  if (!summary) return
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'staff-payroll-summary.json'
  a.click()
  URL.revokeObjectURL(url)
}

const staffStore = useStaffStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())
const activeTab = ref('headcount')

// ── Row tooltips ──────────────────────────────────────────────────────────────
// Shown as an ℹ info icon next to each row label in KYearGrid.
const STAFF_TOOLTIPS: Record<string, { headcount: string; salary: string }> = {
  rnd_engineers: {
    headcount: 'Number of R&D engineers for each year, in Full-Time Equivalents (FTE). Partial values are accepted — e.g. 2.5 means 2 full-time + 1 half-time.',
    salary:    'Monthly gross salary per R&D engineer, in base currency (not thousands). Multiplied by headcount × 12 to compute annual payroll.',
  },
  rnd_product: {
    headcount: 'Product Managers (FTE) responsible for roadmap and feature prioritisation.',
    salary:    'Monthly gross salary per Product Manager, in base currency (not thousands).',
  },
  prod_engineers: {
    headcount: 'Production / DevOps engineers managing deployments, infrastructure, and reliability (FTE).',
    salary:    'Monthly gross salary per Production Engineer, in base currency (not thousands).',
  },
  prod_technicians: {
    headcount: 'Field or on-site technical staff — assembly, operations, and maintenance (FTE).',
    salary:    'Monthly gross salary per Production Technician, in base currency (not thousands).',
  },
  sales_team: {
    headcount: 'Sales representatives, account executives, and SDRs (FTE).',
    salary:    'Monthly gross salary per Sales staff, in base currency (not thousands). Variable commissions are not included here.',
  },
  marketing_team: {
    headcount: 'Demand generation, content, growth, and brand staff (FTE).',
    salary:    'Monthly gross salary per Marketing staff member, in base currency (not thousands).',
  },
  sales_customer_success: {
    headcount: 'Customer Success Managers handling onboarding, retention, and upsell (FTE).',
    salary:    'Monthly gross salary per Customer Success Manager, in base currency (not thousands).',
  },
  admin_managers: {
    headcount: 'Operations, finance, and HR managers (FTE).',
    salary:    'Monthly gross salary per Admin Manager, in base currency (not thousands).',
  },
  admin_assistants: {
    headcount: 'Administrative and office support staff (FTE).',
    salary:    'Monthly gross salary per Admin Assistant, in base currency (not thousands).',
  },
  executive_team: {
    headcount: 'C-level and VP-level leadership (FTE).',
    salary:    'Monthly gross salary per executive, in base currency (not thousands). Include base only — bonuses go in the Incentives tab.',
  },
  gna_finance: {
    headcount: 'Finance, accounting, and controlling staff (FTE).',
    salary:    'Monthly gross salary per Finance/Accounting staff member, in base currency (not thousands).',
  },
  gna_hr: {
    headcount: 'Human Resources and People Operations staff (FTE).',
    salary:    'Monthly gross salary per HR staff member, in base currency (not thousands).',
  },
  gna_it: {
    headcount: 'Internal IT, helpdesk, and infrastructure support staff (FTE).',
    salary:    'Monthly gross salary per IT staff member, in base currency (not thousands).',
  },
}

// Data for grids
// yearIndex convention: DB and compute use 1–5; KYearGrid emits 0-based idx.
// All grid lookups use y=1..5; all edit handlers add +1 to convert from grid idx.
const headcountRows = computed<GridRow[]>(() => {
  return STAFF_CATEGORIES.map(cat => {
    const entries = staffStore.headcounts.filter(h => h.category === cat.key)
    const values = Array.from({ length: MAX_YEARS }, (_, i) =>
      entries.find(e => e.yearIndex === i + 1)?.fte || '0'
    )
    return {
      id: `hc-${cat.key}`,
      label: cat.label,
      values,
      editable: true,
      decimals: 2,
      tooltip: STAFF_TOOLTIPS[cat.key]?.headcount,
    }
  })
})

const salaryRows = computed<GridRow[]>(() => {
  return STAFF_CATEGORIES.map(cat => {
    const entries = staffStore.salaries.filter(s => s.category === cat.key)
    const values = Array.from({ length: MAX_YEARS }, (_, i) =>
      entries.find(e => e.yearIndex === i + 1)?.monthlyGrossSalary || '0'
    )
    return {
      id: `sal-${cat.key}`,
      label: cat.label,
      values,
      editable: true,
      decimals: 0,
      suffix: '€',   // monthly gross salary stored in base euros
      tooltip: STAFF_TOOLTIPS[cat.key]?.salary,
    }
  })
})

const incentiveRows = computed<GridRow[]>(() => {
  const pctRow: GridRow = {
    id: 'incentive-pct',
    label: 'Incentive %',
    values: Array.from({ length: MAX_YEARS }, (_, i) => {
      const entry = staffStore.incentives.find(inc => inc.yearIndex === i + 1)
      return entry?.incentivePct || '0'
    }),
    editable: true,
    decimals: 1,
    suffix: '%',    // fraction of gross salary
    tooltip: 'Annual incentive as a percentage of total gross payroll for each year (e.g. 10 = 10%). Applied evenly across all staff categories.',
  }
  const specificRow: GridRow = {
    id: 'incentive-specific',
    label: 'Specific Incentives',
    values: Array.from({ length: MAX_YEARS }, (_, i) => {
      const entry = staffStore.incentives.find(inc => inc.yearIndex === i + 1)
      return entry?.specificIncentives || '0'
    }),
    editable: true,
    decimals: 0,
    suffix: '€',   // absolute bonus amount in base euros
    tooltip: 'Fixed additional bonuses for the year, in base currency (not thousands). Added on top of the percentage incentive — use for one-off retention bonuses or ESOP-equivalent amounts.',
  }
  return [pctRow, specificRow]
})

const payrollTableRows = computed(() => {
  const years = staffStore.payrollSummary?.years
  if (!years || !Array.isArray(years) || years.length === 0) return []
  return years.map(year => ({
    yearIndex: yearHeaders.value[year.yearIndex - 1],
    totalPayroll: year.totalPayroll,
    employerCharges: year.employerCharges,
    totalWithCharges: year.totalWithCharges,
    incentives: year.incentives,
    totalStaffCost: year.totalStaffCost,
    rnd: year.byFunction.rnd,
    production: year.byFunction.production,
    salesMarketing: year.byFunction.sales_marketing,
    ga: year.byFunction.ga,
  }))
})

// Debounced update functions — each explicitly refreshes payroll summary after the PUT
// so Payroll Summary tab and Graphs stay current without requiring a page navigation.
const debouncedUpdateHeadcount = debounce(async (data: Partial<StaffHeadcount>[]) => {
  await staffStore.updateHeadcounts(data)
  staffStore.fetchPayrollSummary(true).catch(() => {})
}, DEBOUNCE_MS)

const debouncedUpdateSalary = debounce(async (data: Partial<StaffSalary>[]) => {
  await staffStore.updateSalaries(data)
  staffStore.fetchPayrollSummary(true).catch(() => {})
}, DEBOUNCE_MS)

const debouncedUpdateIncentive = debounce(async (data: Partial<StaffIncentive>[]) => {
  await staffStore.updateIncentives(data)
  staffStore.fetchPayrollSummary(true).catch(() => {})
}, DEBOUNCE_MS)

// Refresh payroll summary whenever the user navigates to the Payroll Summary or Graphs tab,
// so they always see data that reflects the latest edits even if they switched tabs quickly.
watch(activeTab, (newTab) => {
  if ((newTab === 'summary' || newTab === 'graphs') &&
      planStore.activePlan && scenarioStore.activeScenario) {
    staffStore.fetchPayrollSummary(true).catch(() => {})
  }
})

// Cell edit handlers — KYearGrid emits 0-based yearIndex; add +1 for DB (1–5)
const handleHeadcountEdit = async (payload: { rowId: string; yearIndex: number; value: number }) => {
  staffStore.dirty.markDirty()
  const catKey = payload.rowId.replace('hc-', '')
  const dbYear = payload.yearIndex + 1
  const existing = staffStore.headcounts.find(
    h => h.category === catKey && h.yearIndex === dbYear
  )
  const updateData = existing
    ? [{ ...existing, fte: String(payload.value) }]
    : [{ category: catKey as any, yearIndex: dbYear, fte: String(payload.value) }]
  await debouncedUpdateHeadcount(updateData)
}

const handleSalaryEdit = async (payload: { rowId: string; yearIndex: number; value: number }) => {
  staffStore.dirty.markDirty()
  const catKey = payload.rowId.replace('sal-', '')
  const dbYear = payload.yearIndex + 1
  const existing = staffStore.salaries.find(
    s => s.category === catKey && s.yearIndex === dbYear
  )
  const updateData = existing
    ? [{ ...existing, monthlyGrossSalary: String(payload.value) }]
    : [{ category: catKey as any, yearIndex: dbYear, monthlyGrossSalary: String(payload.value), annualIncreasePct: '0' }]
  await debouncedUpdateSalary(updateData)
}

const handleIncentiveEdit = async (payload: { rowId: string; yearIndex: number; value: number }) => {
  staffStore.dirty.markDirty()
  const field = payload.rowId === 'incentive-pct' ? 'incentivePct' : 'specificIncentives'
  const dbYear = payload.yearIndex + 1
  const existing = staffStore.incentives.find(inc => inc.yearIndex === dbYear)
  const updateData = existing
    ? [{ ...existing, [field]: String(payload.value) }]
    : [{
        yearIndex: dbYear,
        incentivePct: field === 'incentivePct' ? String(payload.value) : '0',
        specificIncentives: field === 'specificIncentives' ? String(payload.value) : '0',
      }]
  await debouncedUpdateIncentive(updateData)
}

// ── Charts ────────────────────────────────────────────────────────────────────

// Headcount evolution per category (stacked bar)
const headcountChart = computed<ChartData | null>(() => {
  if (!staffStore.headcounts.length) return null
  return {
    labels: yearHeaders.value,
    datasets: STAFF_CATEGORIES.map(cat => ({
      label: cat.label,
      data: Array.from({ length: MAX_YEARS }, (_, i) => {
        const entry = staffStore.headcounts.find(
          h => h.category === cat.key && h.yearIndex === i + 1
        )
        return entry ? Number(entry.fte) : 0
      }),
    })),
  }
})

// Total headcount per year (line overlay)
const totalHeadcountChart = computed<ChartData | null>(() => {
  if (!staffStore.headcounts.length) return null
  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: 'Total Headcount',
        data: Array.from({ length: MAX_YEARS }, (_, i) =>
          staffStore.headcounts
            .filter(h => h.yearIndex === i + 1)
            .reduce((sum, h) => sum + Number(h.fte), 0)
        ),
        type: 'line',
        borderColor: '#1d4ed8',
        backgroundColor: '#1d4ed8',
      },
    ],
  }
})

// Payroll cost by function (stacked bar, scaled by display unit)
const payrollByFunctionChart = computed<ChartData | null>(() => {
  const years = staffStore.payrollSummary?.years
  if (!years?.length) return null
  const sorted = [...years].sort((a, b) => a.yearIndex - b.yearIndex)
  const factor = displayUnitStore.factor
  return {
    labels: sorted.map(y => yearHeaders.value[y.yearIndex - 1] ?? `Y${y.yearIndex}`),
    datasets: [
      { label: 'R&D',             data: sorted.map(y => Number(y.byFunction.rnd) / factor) },
      { label: 'Production',      data: sorted.map(y => Number(y.byFunction.production) / factor) },
      { label: 'Sales & Mktg',    data: sorted.map(y => Number(y.byFunction.sales_marketing) / factor) },
      { label: 'G&A',             data: sorted.map(y => Number(y.byFunction.ga) / factor) },
    ],
  }
})

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await staffStore.fetchAll()
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-800">Staff</h1>
        <KSaveBanner module-key="staff" :loading="staffStore.loading" />
      </div>

      <!-- DEV ONLY toolbar — hidden in production builds -->
      <div v-if="isDev" class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg">
        <span class="text-xs font-bold text-amber-700 uppercase tracking-wide">DEV</span>
        <Button
          label="Fill Sample Data"
          icon="pi pi-database"
          size="small"
          severity="warning"
          outlined
          :loading="devLoading"
          @click="fillSampleData"
        />
        <Button
          label="Download Results"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          outlined
          :disabled="!staffStore.payrollSummary"
          @click="downloadResults"
        />
      </div>
    </div>

    <KFormLegend
      variant="grid"
      description="Plan your 5-year headcount, gross monthly salaries, and incentive rates by department. All values feed directly into the payroll model and P&L. Amounts in the Salaries tab are monthly gross in your currency unit (not thousands)."
      :extras="[{ icon: 'pi-users', text: 'Headcount in FTE (full-time equivalents); partial values are accepted' }]"
    />

    <div v-if="staffStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <Tabs v-else :value="activeTab" @update:value="(v: any) => activeTab = v">
      <TabList>
        <Tab value="headcount">Headcount Plan</Tab>
        <Tab value="salaries">Monthly Gross Salaries</Tab>
        <Tab value="incentives">Incentives</Tab>
        <Tab value="summary">Payroll Summary</Tab>
        <Tab value="graphs">Graphs</Tab>
      </TabList>
      <TabPanels>
        <!-- Headcount Tab -->
        <TabPanel value="headcount">
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Headcount Plan (FTE)</h2>
            <KYearGrid
              :rows="headcountRows"
              @cell-edit="handleHeadcountEdit"
            />
            <p class="text-sm text-gray-600 mt-4">
              Enter headcount in Full-Time Equivalents (FTE). Auto-copy Y1 values to Y2-Y5 on first fill.
            </p>
          </div>
        </TabPanel>

        <!-- Salaries Tab -->
        <TabPanel value="salaries">
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Monthly Gross Salaries</h2>
            <KYearGrid
              :rows="salaryRows"
              @cell-edit="handleSalaryEdit"
            />
            <p class="text-sm text-gray-600 mt-4">
              Monthly gross salary per category. Gross total includes social and fiscal charges.
            </p>
          </div>
        </TabPanel>

        <!-- Incentives Tab -->
        <TabPanel value="incentives">
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Incentives & Bonuses</h2>
            <KYearGrid
              :rows="incentiveRows"
              @cell-edit="handleIncentiveEdit"
            />
            <p class="text-sm text-gray-600 mt-4">
              Incentive percentage and specific incentives (bonuses, stock options, etc.) per year.
            </p>
          </div>
        </TabPanel>

        <!-- Payroll Summary Tab -->
        <TabPanel value="summary">
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Payroll Summary</h2>
            <DataTable
              :value="payrollTableRows"
              class="p-datatable-sm"
              showGridlines
              size="small"
            >
              <Column field="yearIndex" header="Year" />
              <Column field="totalPayroll" header="Total Payroll">
                <template #body="{ data }">
                  {{ formatUnit(data.totalPayroll, 0) }}
                </template>
              </Column>
              <Column field="employerCharges" header="Employer Charges">
                <template #body="{ data }">
                  {{ formatUnit(data.employerCharges, 0) }}
                </template>
              </Column>
              <Column field="totalWithCharges" header="Total with Charges">
                <template #body="{ data }">
                  {{ formatUnit(data.totalWithCharges, 0) }}
                </template>
              </Column>
              <Column field="incentives" header="Incentives">
                <template #body="{ data }">
                  {{ formatUnit(data.incentives, 0) }}
                </template>
              </Column>
              <Column field="totalStaffCost" header="Total Staff Cost">
                <template #body="{ data }">
                  {{ formatUnit(data.totalStaffCost, 0) }}
                </template>
              </Column>
              <Column field="rnd" header="R&D">
                <template #body="{ data }">
                  {{ formatUnit(data.rnd, 0) }}
                </template>
              </Column>
              <Column field="production" header="Production">
                <template #body="{ data }">
                  {{ formatUnit(data.production, 0) }}
                </template>
              </Column>
              <Column field="salesMarketing" header="Sales & Marketing">
                <template #body="{ data }">
                  {{ formatUnit(data.salesMarketing, 0) }}
                </template>
              </Column>
              <Column field="ga" header="G&A">
                <template #body="{ data }">
                  {{ formatUnit(data.ga, 0) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>
        <!-- Graphs Tab -->
        <TabPanel value="graphs">
          <div class="p-4 flex flex-col gap-6">
            <div
              v-if="!staffStore.headcounts.length"
              class="flex items-center justify-center py-16 text-gray-400"
            >
              No staff data — fill in the Headcount Plan first.
            </div>

            <template v-else>
              <!-- Headcount by category (stacked bar) -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  Headcount Evolution by Category (FTE)
                </h2>
                <KChart
                  :data="headcountChart"
                  type="stacked-bar"
                  height="320px"
                  :loading="staffStore.loading"
                />
              </div>

              <!-- Total headcount trend (line) -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  Total Headcount Trend
                </h2>
                <KChart
                  :data="totalHeadcountChart"
                  type="line"
                  height="240px"
                  :loading="staffStore.loading"
                />
              </div>

              <!-- Payroll by function (stacked bar) -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  Payroll Cost by Function ({{ unitLabel }})
                </h2>
                <div
                  v-if="!staffStore.payrollSummary"
                  class="flex items-center justify-center h-40 text-gray-400"
                >
                  Payroll summary not available yet.
                </div>
                <KChart
                  v-else
                  :key="`payroll-${unitLabel}`"
                  :data="payrollByFunctionChart"
                  type="stacked-bar"
                  height="320px"
                  :loading="staffStore.loading"
                />
              </div>
            </template>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
