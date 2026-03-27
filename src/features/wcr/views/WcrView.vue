<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useWcrStore } from '@/features/wcr/stores/wcrStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import type { ChartData } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import Message from 'primevue/message'
import InputNumber from 'primevue/inputnumber'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import KChart from '@/components/common/KChart.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

defineProps<{ planId?: string; sid?: string }>()

const wcrStore = useWcrStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, formatPercent, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())

onMounted(async () => {
  await wcrStore.fetchReport()
  await wcrStore.fetchEntries()
  // Pre-populate editable entries from persisted store values
  for (const entry of wcrStore.entries) {
    if (editableEntries.value[entry.lineId] !== undefined) {
      editableEntries.value[entry.lineId][entry.yearIndex] = Number(entry.amount)
    }
  }
})

// Editable entries — keys match backend WCRLineID constants
const editableEntries = ref<Record<string, number[]>>({
  prepaid_expenses:  Array(5).fill(0),
  deferred_revenue:  Array(5).fill(0),
  tax_receivables:   Array(5).fill(0),
  other_adjust_plus: Array(5).fill(0),
  other_adjust_minus: Array(5).fill(0),
})

// ── Tooltip maps ──────────────────────────────────────────────────────────────

const CUSTOMER_TOOLTIPS: Record<string, string> = {
  'Sales excl. VAT':              'Total revenue excluding VAT, from the product-line revenue model.',
  'Export excl. VAT':             'Export sales excluding VAT (0% VAT rate applies to intra-EU and international sales).',
  'Sales incl. Tax':              'Total sales including applicable VAT — the gross invoice amount issued to customers.',
  'Customer Receivables (Total)': 'Outstanding receivables from customers, based on DSO allocation across payment tranches configured in Settings.',
}

const INVENTORY_TOOLTIPS: Record<string, string> = {
  'COGS (base)':     'Cost of Goods Sold used as the basis for inventory valuation.',
  'Inventory %':     'Percentage of annual COGS held as inventory, derived from the inventory coverage days set in Settings.',
  'Inventory Value': 'Monetary value of inventory = COGS × Inventory %. Represents working capital tied up in unsold stock.',
}

const SUPPLIER_TOOLTIPS: Record<string, string> = {
  'COGS excl. VAT':             'Cost of Goods Sold excluding VAT — the primary driver of supplier payables.',
  'External charges excl. VAT': 'External operating expenses (OPEX) excluding VAT that generate supplier payment obligations.',
  'CapEx excl. VAT':            'Capital expenditure excluding VAT that creates supplier payables.',
  'Total incl. VAT':            'Total purchases including applicable VAT — the basis for computing supplier payable amounts.',
  'Supplier Payables (Total)':  'Outstanding amounts owed to suppliers, based on DPO allocation across payment tranches configured in Settings.',
}

const SUMMARY_TOOLTIPS: Record<string, string> = {
  'Customer WCR':     'WCR from customer receivables — cash tied up waiting for customer payments. Positive value increases WCR.',
  'Inventory WCR':    'WCR from inventory — cash tied up in unsold stock. Positive value increases WCR.',
  'Supplier WCR':     'WCR from supplier payables — cash freed up by delayed payments to suppliers. Negative value reduces WCR.',
  'Basic WCR':        'Core WCR = Customer Receivables + Inventory − Supplier Payables, before fiscal/social and manual adjustments.',
  'Basic WCR (days)': 'Basic WCR expressed in days of revenue. Useful for benchmarking against industry norms.',
}

const FISCAL_TOOLTIPS: Record<string, string> = {
  'VAT Collected':          'VAT received from customers on sales — a liability until remitted to tax authorities.',
  'VAT Deductible':         'VAT paid on purchases that can be reclaimed — reduces net VAT liability.',
  'Net VAT Payable':        'Net VAT balance = VAT Collected − VAT Deductible — the amount owed to tax authorities each settlement period.',
  'VAT Liability':          'Deferred VAT payable, based on the quarterly/monthly VAT settlement cycle set in Settings.',
  'Employer Charges':       'Employer social security contributions payable — typically settled the month following payroll.',
  'Employee Charges':       'Employee social security contributions withheld from gross salaries and payable to social security bodies.',
  'Social Liability':       'Total social charges payable (employer + employee contributions combined).',
  'Corporate Tax Liability':'Accrued corporate income tax payable, based on estimated taxable profit for the period.',
  'Total Fiscal & Social':  'Total fiscal and social debts — reduces WCR as these represent interest-free financing from public bodies.',
}

const ADJUSTMENT_SUMMARY_TOOLTIPS: Record<string, string> = {
  'Prepaid Expenses': 'Payments made in advance for services/expenses not yet consumed (e.g. annual insurance, subscriptions).',
  'Deferred Revenue': 'Customer prepayments for services not yet delivered — a liability that reduces WCR.',
  'Tax Receivables':  'Tax credits or refunds due from authorities (e.g. R&D tax credit, VAT refund balance).',
  'Other Increase':   'Custom WCR-increasing items not captured in the standard categories.',
  'Other Decrease':   'Custom WCR-decreasing items not captured in the standard categories.',
  'Net Adjustment':   'Total net impact of all manual adjustments on WCR (increases − decreases).',
}

const ADJUSTED_TOOLTIPS: Record<string, string> = {
  'Adjusted WCR':        'Comprehensive WCR including all fiscal, social and manual adjustments.',
  'Adjusted WCR (days)': 'Adjusted WCR expressed in days of revenue.',
  'Adjusted WCR Change': 'Year-over-year change in Adjusted WCR. A negative value means WCR is improving (releasing cash).',
}

const ADJUSTMENT_INPUT_TOOLTIPS: Record<string, string> = {
  'Prepaid Expenses':  'Enter advance payments for expenses covering future periods (e.g. annual subscriptions, rent deposits).',
  'Deferred Revenue':  'Enter customer prepayments for services to be delivered in future periods.',
  'Tax Receivables':   'Enter expected tax refunds or credits (e.g. R&D tax credit, VAT credit carryforward).',
  'Other Increase':    'Enter any other item that increases WCR not covered by the standard categories.',
  'Other Decrease':    'Enter any other item that decreases WCR not covered by the standard categories.',
}

// ── Transform sub-structs into DataTable-friendly {label, values[]} rows ──

const customerWcrRows = computed(() => {
  if (!wcrStore.report) return []
  const c = wcrStore.report.customers
  return [
    { label: 'Sales excl. VAT',              values: Array.from(c.salesExclVat),    tooltip: CUSTOMER_TOOLTIPS['Sales excl. VAT'] },
    { label: 'Export excl. VAT',             values: Array.from(c.exportExclVat),   tooltip: CUSTOMER_TOOLTIPS['Export excl. VAT'] },
    { label: 'Sales incl. Tax',              values: Array.from(c.salesInclTax),    tooltip: CUSTOMER_TOOLTIPS['Sales incl. Tax'] },
    { label: 'Customer Receivables (Total)', values: Array.from(c.totalCustomers),  tooltip: CUSTOMER_TOOLTIPS['Customer Receivables (Total)'] },
  ]
})

const inventoryRows = computed(() => {
  if (!wcrStore.report) return []
  const inv = wcrStore.report.inventory
  return [
    { label: 'COGS (base)',      values: Array.from(inv.cogsBase),       isPct: false, tooltip: INVENTORY_TOOLTIPS['COGS (base)'] },
    { label: 'Inventory %',      values: Array.from(inv.inventoryPct),   isPct: true,  tooltip: INVENTORY_TOOLTIPS['Inventory %'] },
    { label: 'Inventory Value',  values: Array.from(inv.inventoryValue), isPct: false, tooltip: INVENTORY_TOOLTIPS['Inventory Value'] },
  ]
})

const supplierWcrRows = computed(() => {
  if (!wcrStore.report) return []
  const s = wcrStore.report.suppliers
  return [
    { label: 'COGS excl. VAT',              values: Array.from(s.cogsExclVat),     tooltip: SUPPLIER_TOOLTIPS['COGS excl. VAT'] },
    { label: 'External charges excl. VAT',  values: Array.from(s.externalExclVat), tooltip: SUPPLIER_TOOLTIPS['External charges excl. VAT'] },
    { label: 'CapEx excl. VAT',             values: Array.from(s.capexExclVat),    tooltip: SUPPLIER_TOOLTIPS['CapEx excl. VAT'] },
    { label: 'Total incl. VAT',             values: Array.from(s.totalInclVat),    tooltip: SUPPLIER_TOOLTIPS['Total incl. VAT'] },
    { label: 'Supplier Payables (Total)',   values: Array.from(s.totalSuppliers),  tooltip: SUPPLIER_TOOLTIPS['Supplier Payables (Total)'] },
  ]
})

const summaryRows = computed(() => {
  if (!wcrStore.report) return []
  const sum = wcrStore.report.summary
  return [
    { label: 'Customer WCR',     values: Array.from(sum.customerWcr),   isDays: false, tooltip: SUMMARY_TOOLTIPS['Customer WCR'] },
    { label: 'Inventory WCR',    values: Array.from(sum.inventoryWcr),  isDays: false, tooltip: SUMMARY_TOOLTIPS['Inventory WCR'] },
    { label: 'Supplier WCR',     values: Array.from(sum.supplierWcr),   isDays: false, tooltip: SUMMARY_TOOLTIPS['Supplier WCR'] },
    { label: 'Basic WCR',        values: Array.from(sum.basicWcr),      isDays: false, tooltip: SUMMARY_TOOLTIPS['Basic WCR'] },
    { label: 'Basic WCR (days)', values: Array.from(sum.basicWcrDays),  isDays: true,  tooltip: SUMMARY_TOOLTIPS['Basic WCR (days)'] },
  ]
})

const fiscalSocialRows = computed(() => {
  if (!wcrStore.report) return []
  const fs = wcrStore.report.fiscalSocial
  return [
    { label: 'VAT Collected',           values: Array.from(fs.vatCollected),       tooltip: FISCAL_TOOLTIPS['VAT Collected'] },
    { label: 'VAT Deductible',          values: Array.from(fs.vatDeductible),      tooltip: FISCAL_TOOLTIPS['VAT Deductible'] },
    { label: 'Net VAT Payable',         values: Array.from(fs.netVatPayable),      tooltip: FISCAL_TOOLTIPS['Net VAT Payable'] },
    { label: 'VAT Liability',           values: Array.from(fs.vatLiability),       tooltip: FISCAL_TOOLTIPS['VAT Liability'] },
    { label: 'Employer Charges',        values: Array.from(fs.employerCharges),    tooltip: FISCAL_TOOLTIPS['Employer Charges'] },
    { label: 'Employee Charges',        values: Array.from(fs.employeeCharges),    tooltip: FISCAL_TOOLTIPS['Employee Charges'] },
    { label: 'Social Liability',        values: Array.from(fs.socialLiability),    tooltip: FISCAL_TOOLTIPS['Social Liability'] },
    { label: 'Corporate Tax Liability', values: Array.from(fs.corporateTaxLiab),   tooltip: FISCAL_TOOLTIPS['Corporate Tax Liability'] },
    { label: 'Total Fiscal & Social',   values: Array.from(fs.totalFiscalSocial),  tooltip: FISCAL_TOOLTIPS['Total Fiscal & Social'] },
  ]
})

const adjustmentSummaryRows = computed(() => {
  if (!wcrStore.report) return []
  const a = wcrStore.report.adjustments
  return [
    { label: 'Prepaid Expenses', values: Array.from(a.prepaidExpenses),  tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Prepaid Expenses'] },
    { label: 'Deferred Revenue', values: Array.from(a.deferredRevenue),  tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Deferred Revenue'] },
    { label: 'Tax Receivables',  values: Array.from(a.taxReceivables),   tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Tax Receivables'] },
    { label: 'Other Increase',   values: Array.from(a.otherAdjustPlus),  tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Other Increase'] },
    { label: 'Other Decrease',   values: Array.from(a.otherAdjustMinus), tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Other Decrease'] },
    { label: 'Net Adjustment',   values: Array.from(a.netAdjustment),    tooltip: ADJUSTMENT_SUMMARY_TOOLTIPS['Net Adjustment'] },
  ]
})

const adjustedRows = computed(() => {
  if (!wcrStore.report) return []
  const adj = wcrStore.report.adjusted
  return [
    { label: 'Adjusted WCR',        values: Array.from(adj.adjustedWcr),       isDays: false, tooltip: ADJUSTED_TOOLTIPS['Adjusted WCR'] },
    { label: 'Adjusted WCR (days)', values: Array.from(adj.adjustedWcrDays),   isDays: true,  tooltip: ADJUSTED_TOOLTIPS['Adjusted WCR (days)'] },
    { label: 'Adjusted WCR Change', values: Array.from(adj.adjustedWcrChange), isDays: false, tooltip: ADJUSTED_TOOLTIPS['Adjusted WCR Change'] },
  ]
})

const adjustmentInputRows = computed(() => [
  { lineId: 'prepaid_expenses',   label: 'Prepaid Expenses', tooltip: ADJUSTMENT_INPUT_TOOLTIPS['Prepaid Expenses'] },
  { lineId: 'deferred_revenue',   label: 'Deferred Revenue', tooltip: ADJUSTMENT_INPUT_TOOLTIPS['Deferred Revenue'] },
  { lineId: 'tax_receivables',    label: 'Tax Receivables',  tooltip: ADJUSTMENT_INPUT_TOOLTIPS['Tax Receivables'] },
  { lineId: 'other_adjust_plus',  label: 'Other Increase',   tooltip: ADJUSTMENT_INPUT_TOOLTIPS['Other Increase'] },
  { lineId: 'other_adjust_minus', label: 'Other Decrease',   tooltip: ADJUSTMENT_INPUT_TOOLTIPS['Other Decrease'] },
])

// WCR Change is in report.summary.wcrChange
const wcrChangeValues = computed<number[]>(() => {
  if (!wcrStore.report) return []
  return Array.from(wcrStore.report.summary.wcrChange)
})

const hasLargeWcrChange = computed(() =>
  wcrChangeValues.value.some((val) => Math.abs(val ?? 0) > 1_000_000)
)

// Chart data built directly from report.charts — no separate API call
const wcrChartData = computed<ChartData | null>(() => {
  if (!wcrStore.report) return null
  const c = wcrStore.report.charts
  const factor = displayUnitStore.factor
  const sc = (arr: readonly number[]) => Array.from(arr).map(v => v / factor)
  return {
    labels: yearHeaders.value,
    datasets: [
      { label: 'Customer WCR',    data: sc(c.customerWcr) },
      { label: 'Inventory WCR',   data: sc(c.inventoryWcr) },
      { label: 'Supplier WCR',    data: sc(c.supplierWcr) },
      { label: 'Fiscal & Social', data: sc(c.fiscalSocialWcr) },
    ],
  }
})

// ── DEV audit trail ──────────────────────────────────────────────────────────
function downloadAuditTrail() {
  if (!wcrStore.report) return
  const r = wcrStore.report
  const snap = r.configSnapshot
  const trancheTable = snap.days.map((days, k) => ({
    days,
    customerPct: snap.customerPcts[k],
    supplierPct: snap.supplierPcts[k],
  }))
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), source: 'WcrView audit trail (DEV)' },
    config: { effectiveDso: r.effectiveDso, effectiveDpo: r.effectiveDpo, trancheTable, inventoryPcts: snap.inventoryPcts },
    report: r,
    entries: wcrStore.entries,
    derived: { customerWcrRows: customerWcrRows.value, inventoryRows: inventoryRows.value, supplierWcrRows: supplierWcrRows.value, summaryRows: summaryRows.value, fiscalSocialRows: fiscalSocialRows.value, adjustmentSummaryRows: adjustmentSummaryRows.value, adjustedRows: adjustedRows.value, wcrChangeValues: wcrChangeValues.value, wcrChartData: wcrChartData.value },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wcr-audit-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function saveAdjustments() {
  const updatedEntries = wcrStore.entries.map((entry) => ({
    ...entry,
    amount: String(editableEntries.value[entry.lineId]?.[entry.yearIndex] ?? 0),
  }))
  await wcrStore.updateEntries(updatedEntries)
  await wcrStore.fetchReport()
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-800">Working Capital Requirement (WCR)</h1>
      <!-- DEV ONLY — remove before production -->
      <button
        v-if="wcrStore.report"
        title="DEV: download full WCR audit trail as JSON"
        @click="downloadAuditTrail"
        style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; font-size:0.72rem; font-weight:600; color:#92400e; background:#fef3c7; border:1px dashed #f59e0b; border-radius:6px; cursor:pointer; letter-spacing:0.04em"
      >
        <span>⬇ DEV</span>
        <span style="font-weight:400; color:#b45309">audit trail</span>
      </button>
    </div>

    <KFormLegend
      variant="grid"
      description="Working Capital Requirement = Customer Receivables + Inventory − Supplier Payables − Fiscal/Social Debts. Values are computed from payment terms in Settings. Use the Adjustments section to add prepaid expenses, deferred revenue, or tax receivables not captured elsewhere."
      :extras="[{ icon: 'pi-pencil', text: 'Only the Adjustments rows are editable — all other rows are computed automatically' }]"
    />

    <Tabs value="0" class="w-full">
      <TabList>
        <Tab value="0"><span>WCR Analysis</span></Tab>
        <Tab value="1"><span>WCR Chart</span></Tab>
      </TabList>

      <TabPanels>
        <!-- WCR Analysis Tab -->
        <TabPanel value="0">
          <div v-if="wcrStore.loading" class="text-center py-8 text-gray-500">
            Loading WCR analysis...
          </div>
          <div v-else-if="wcrStore.error" class="text-center py-8">
            <Message severity="error">{{ wcrStore.error }}</Message>
          </div>
          <div v-else class="space-y-6">

            <!-- Customer WCR Section -->
            <Card>
              <template #title>
                <div class="flex items-center gap-3">
                  <span>Customer WCR</span>
                  <span
                    v-if="wcrStore.report"
                    title="Effective DSO = Σ(allocationPct × days) across the 5 payment tranches"
                    style="font-size:0.72rem; font-weight:600; padding:2px 9px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:9999px; letter-spacing:0.03em"
                  >
                    DSO {{ Number(wcrStore.report.effectiveDso ?? 0).toFixed(1) }} d
                  </span>
                </div>
              </template>
              <template #content>
                <DataTable :value="customerWcrRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-medium" header="Component">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatUnit(data.values?.[idx] ?? 0) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Inventory Section -->
            <Card>
              <template #title>Inventory</template>
              <template #content>
                <DataTable :value="inventoryRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-medium" header="Component">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">
                        <template v-if="data.isPct">{{ formatPercent(data.values?.[idx] ?? 0) }}</template>
                        <template v-else>{{ formatUnit(data.values?.[idx] ?? 0) }}</template>
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Supplier WCR Section -->
            <Card>
              <template #title>
                <div class="flex items-center gap-3">
                  <span>Supplier WCR</span>
                  <span
                    v-if="wcrStore.report"
                    title="Effective DPO = Σ(allocationPct × days) across the 5 payment tranches"
                    style="font-size:0.72rem; font-weight:600; padding:2px 9px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:9999px; letter-spacing:0.03em"
                  >
                    DPO {{ Number(wcrStore.report.effectiveDpo ?? 0).toFixed(1) }} d
                  </span>
                </div>
              </template>
              <template #content>
                <DataTable :value="supplierWcrRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-medium" header="Component">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatUnit(data.values?.[idx] ?? 0) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- WCR Summary Section -->
            <Card>
              <template #title>WCR Summary</template>
              <template #content>
                <DataTable :value="summaryRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-bold" header="Summary">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-bold">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right font-semibold">
                        <template v-if="data.isDays">{{ (data.values?.[idx] ?? 0).toFixed(1) }} d</template>
                        <template v-else>{{ formatUnit(data.values?.[idx] ?? 0) }}</template>
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Fiscal & Social Debt Section -->
            <Card>
              <template #title>Fiscal &amp; Social Debt</template>
              <template #content>
                <DataTable :value="fiscalSocialRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-medium" header="Debt Component">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatUnit(data.values?.[idx] ?? 0) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Editable Adjustments Input Section -->
            <Card>
              <template #title>WCR Adjustments (Input)</template>
              <template #content>
                <DataTable
                  :value="adjustmentInputRows"
                  stripedRows
                  showGridlines
                  scrollable
                  class="p-datatable-sm"
                >
                  <Column frozen class="min-w-[220px] font-medium" header="Adjustment Line">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <InputNumber
                        v-model="editableEntries[data.lineId][idx]"
                        mode="decimal"
                        :minFractionDigits="0"
                        class="w-full text-right"
                      />
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Computed Adjustments Breakdown (read-only) -->
            <Card>
              <template #title>Adjustment Summary (Computed)</template>
              <template #content>
                <DataTable :value="adjustmentSummaryRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-medium" header="Line">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span
                        class="block text-right"
                        :class="data.label === 'Net Adjustment' ? 'font-semibold' : ''"
                      >
                        {{ formatUnit(data.values?.[idx] ?? 0) }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- Adjusted WCR Section -->
            <Card>
              <template #title>Adjusted WCR</template>
              <template #content>
                <DataTable :value="adjustedRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column frozen class="min-w-[220px] font-bold" header="Adjusted WCR">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-bold">
                        {{ data.label }}
                        <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right font-semibold">
                        <template v-if="data.isDays">{{ (data.values?.[idx] ?? 0).toFixed(1) }} d</template>
                        <template v-else>{{ formatUnit(data.values?.[idx] ?? 0) }}</template>
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>

            <!-- WCR Change Section (with red highlighting if large) -->
            <Card :class="hasLargeWcrChange ? 'border-2 border-red-400 bg-red-50' : ''">
              <template #title>
                <span :class="hasLargeWcrChange ? 'text-red-700 font-bold' : ''">WCR Change</span>
              </template>
              <template #content>
                <div class="grid grid-cols-5 gap-4">
                  <div
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :class="[
                      'p-4 rounded border text-center',
                      hasLargeWcrChange && Math.abs(wcrChangeValues[idx] ?? 0) > 1_000_000
                        ? 'bg-red-200 border-red-400'
                        : 'bg-gray-100 border-gray-300',
                    ]"
                  >
                    <div class="text-sm font-semibold text-gray-700">{{ year }}</div>
                    <div :class="hasLargeWcrChange ? 'text-red-900 font-bold text-lg' : 'text-gray-900 text-lg font-medium'">
                      {{ formatUnit(wcrChangeValues[idx] ?? 0) }}
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Save Button -->
            <div class="flex justify-end">
              <button
                @click="saveAdjustments"
                :disabled="wcrStore.loading"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                Save Adjustments
              </button>
            </div>
          </div>
        </TabPanel>

        <!-- WCR Chart Tab -->
        <TabPanel value="1">
          <Card>
            <template #content>
              <div class="border rounded-lg p-6 bg-gray-50">
                <KChart
                  :key="unitLabel"
                  :data="wcrChartData"
                  type="stacked-bar"
                  height="384px"
                  title="WCR Components Evolution"
                  :loading="wcrStore.loading"
                />
              </div>
            </template>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
:deep(.p-tabs) {
  @apply border-0;
}

:deep(.p-tabs .p-tablist) {
  @apply border-b border-gray-300;
}

:deep(.p-tabs .p-tab) {
  @apply px-4 py-2;
}
</style>
