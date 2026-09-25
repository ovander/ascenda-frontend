<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { escapeHtml as esc } from '@/utils/escapeHtml'
import { useBudgetStore } from '@/features/budget/stores/budgetStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import KMonthGrid from '@/components/common/KMonthGrid.vue'
import KYearGrid from '@/components/common/KYearGrid.vue'
import DataContainer from '@/components/layout/DataContainer.vue'
import type { MonthGridRow } from '@/components/common/KMonthGrid.vue'
import type { GridRow } from '@/components/common/KYearGrid.vue'

defineProps<{ planId?: string; sid?: string }>()

const budgetStore = useBudgetStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()
const { monthHeaders } = useYearHeaders()
const { getLocale, getUnitLabel } = useDecimal()
const unitLabel = computed(() => getUnitLabel())

const activeTab = ref('year1')
const monthGridRows = ref<MonthGridRow[][]>([])
const quarterlyRows = ref<GridRow[]>([])

const gridYears = computed(() => 1)

const quarterlyColumns = computed<string[]>(() =>
  budgetStore.budget2Report?.quarterly?.columns ?? ['Q1', 'Q2', 'Q3', 'Q4']
)

onMounted(async () => {
  if (planStore.activePlan && settingsStore.config) {
    await Promise.all([
      budgetStore.fetchOverrides(),
      budgetStore.fetchBudget1(),
      budgetStore.fetchBudget2(),
    ])

    // ── Budget tooltip maps keyed on lineId ───────────────────────────────────
    const BUDGET_SECTION_TOOLTIPS: Record<string, string> = {
      'Revenue':               'Monthly revenue lines: sales turnover and other income. Values flow from the Revenue module and can be overridden month by month.',
      'COGS':                  'Cost of Goods Sold — direct costs tied to production: raw materials, subcontracting, and direct labour. Drives Gross Margin.',
      'External Expenses':     'Operating expenditures not tied directly to production: rent, leasing, professional fees, royalties, travel, marketing, and HR costs.',
      'Staff Costs':           'Payroll and incentive costs for all employee categories. Values come from the Staff module by function.',
      'Taxes & Depreciation':  'Taxes & duties, EBITDA subtotal, and depreciation of fixed assets (from the Capex module).',
      'Financial & Net Profit':'Financial income and expense (interest), corporate tax provision, and the resulting Net Profit after all charges.',
    }
    const BUDGET_LINE_TOOLTIPS: Record<string, string> = {
      'sales_revenue':     'Revenue from primary product and service sales, as modelled in the Revenue module.',
      'other_revenue':     'Non-operating or secondary revenue (grants, subsidies, other income) not captured in core sales.',
      'total_revenue':     'Sum of Sales Revenue and Other Revenue — the top line of the P&L.',
      'raw_materials':     'Direct material purchases consumed in production. Computed from the COGS settings.',
      'subcontracting':    'External work subcontracted to third parties for production or delivery.',
      'direct_labor':      'Wages for production staff directly involved in making the product or delivering the service.',
      'total_cogs':        'Total Cost of Goods Sold = Raw Materials + Subcontracting + Direct Labor.',
      'gross_margin':      'Gross Margin = Revenue − COGS. The primary indicator of production profitability before overhead.',
      'rent_expenses':     'Monthly office, warehouse, or facility rent payments.',
      'leasing_expenses':  'Lease payments for equipment or vehicles (operating leases not capitalised as assets).',
      'prof_fees':         'Professional fees: legal, accounting, consulting, and advisory services.',
      'royalties':         'Licence fees or royalty payments owed for intellectual property usage.',
      'travel_expenses':   'Staff travel, accommodation, and entertainment costs.',
      'marketing_exp':     'Marketing, advertising, trade shows, and promotional spend.',
      'hr_expenses':       'HR-related costs: recruitment, training, and employee welfare.',
      'total_external':    'Sum of all external operating expenses (Rent + Leasing + Prof. Fees + Royalties + Travel + Marketing + HR).',
      'payroll':           'Total gross payroll cost (salaries + employer social charges) across all functions. Flows from the Staff module.',
      'incentives':        'Variable pay, bonuses, and profit-sharing plans for employees.',
      'total_staff':       'Total staff costs = Payroll + Incentives.',
      'taxes_duties':      'Taxes and duties that are operating expenses (e.g. business rates, local levies) — distinct from corporate income tax.',
      'ebitda':            'EBITDA = Gross Margin − External Expenses − Staff Costs − Taxes & Duties. Core operating profitability before depreciation.',
      'depreciation':      'Annual depreciation of fixed assets, computed from the Capex module investment schedule.',
      'ebit':              'EBIT = EBITDA − Depreciation. Operating profit after accounting for asset wear.',
      'financial_income':  'Interest earned on cash balances and other financial investments.',
      'financial_exp':     'Interest and financial charges on loans and debt instruments.',
      'pre_tax_profit':    'Profit Before Tax = EBIT + Financial Income − Financial Expense.',
      'corporate_tax':     'Corporate income tax provision estimated on Pre-Tax Profit using the tax rate configured in Settings.',
      'net_profit':        'Net Profit = Pre-Tax Profit − Corporate Tax. The bottom line of the P&L budget.',
    }

    // Build month grid rows from budget1 — group by section, inject header rows
    if (budgetStore.budget1Report?.rows?.length) {
      const rows: MonthGridRow[] = []
      let lastSection = ''
      budgetStore.budget1Report.rows.forEach((row) => {
        if (row.section && row.section !== lastSection) {
          lastSection = row.section
          rows.push({
            id: '',
            group: row.section,
            label: row.section,
            months: [],
            annualTotal: 0,
            tooltip: BUDGET_SECTION_TOOLTIPS[row.section],
          })
        }
        rows.push({
          id: `budget-${row.lineId}`,
          label: row.label,
          months: row.months.map((m) => parseFloat(m) || 0),
          annualTotal: parseFloat(row.annualTotal) || 0,
          editable: !row.isTotal,
          isComputed: row.isTotal,
          distributionRule: row.distributionRule as MonthGridRow['distributionRule'],
          tooltip: BUDGET_LINE_TOOLTIPS[row.lineId],
        })
      })
      monthGridRows.value = [rows]
    }

    // Build quarterly rows from budget2
    if (budgetStore.budget2Report?.quarterly?.rows?.length) {
      quarterlyRows.value = budgetStore.budget2Report.quarterly.rows.map((row) => ({
        id: `budget2-${row.lineId}`,
        label: row.label,
        values: row.values.map((v) => parseFloat(v as unknown as string) || 0),
        editable: false,
        isComputed: true,
        isAggregate: row.isAggregate,
        tooltip: BUDGET_LINE_TOOLTIPS[row.lineId],
      }))
    }
  }
})

async function onCellEdit(_payload: any) {
  // This would update the override in the store
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportBudgetPDF() {
  if (!monthGridRows.value.length && !quarterlyRows.value.length) return

  const locale = getLocale()
  const currency = settingsStore.config?.currency ?? 'EUR'

  function fmt(val: string | number): string {
    const n = typeof val === 'string' ? parseFloat(val) : val
    if (!isFinite(n)) return '—'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  }

  const months = monthHeaders.value  // ['Jan','Feb', ...]

  // ── Year 1 monthly table ──────────────────────────────────────────────────
  function buildYear1Table(): string {
    const rows = monthGridRows.value[0] ?? []
    const thBase = 'padding:4px 6px;font-size:9px;font-weight:600;text-align:right;white-space:nowrap;'
    const thLabelStyle = 'padding:4px 8px;font-size:9px;font-weight:600;text-align:left;background:#1e3a5f;color:#fff;'

    const headerCells = months
      .map((m) => `<th style="${thBase}background:#1e3a5f;color:#fff;">${esc(m)}</th>`)
      .join('')
    const totalHeader = `<th style="${thBase}background:#1e3a5f;color:#fff;">Total</th>`

    const bodyRows = rows
      .map((row) => {
        if (!row.id) {
          // Section header
          return `<tr>
            <td colspan="${months.length + 2}" style="padding:5px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:#e8f0fe;color:#1e3a5f;border-top:1px solid #c3d3ee;">
              ${esc(row.label)}
            </td>
          </tr>`
        }

        const isTotal = row.isComputed
        const rowBg   = isTotal ? '#f0f9ff' : '#fff'
        const fw      = isTotal ? '700' : '400'

        const labelCell = `<td style="padding:3px 8px;font-size:8.5px;font-weight:${fw};background:${rowBg};white-space:nowrap;${isTotal ? '' : 'padding-left:20px;'}">${esc(row.label)}</td>`

        const mCells = row.months.map((v) => {
          const n = typeof v === 'number' ? v : parseFloat(v as string)
          const color = isFinite(n) && n < 0 ? 'color:#dc2626;' : ''
          return `<td style="padding:3px 6px;font-size:8px;text-align:right;background:${rowBg};${color}font-weight:${fw};">${fmt(n)}</td>`
        }).join('')

        const total = typeof row.annualTotal === 'number' ? row.annualTotal : parseFloat(row.annualTotal as string)
        const totalColor = isFinite(total) && total < 0 ? 'color:#dc2626;' : ''
        const totalCell = `<td style="padding:3px 8px;font-size:8px;text-align:right;font-weight:700;background:${rowBg};${totalColor}border-left:1px solid #cbd5e1;">${fmt(total)}</td>`

        return `<tr>${labelCell}${mCells}${totalCell}</tr>`
      })
      .join('')

    return `
      <div style="margin-bottom:32px;page-break-after:always;">
        <h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 8px 0;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">
          Year 1 Budget — Monthly P&L
        </h2>
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
          <colgroup>
            <col style="width:140px;">
            ${months.map(() => '<col style="width:52px;">').join('')}
            <col style="width:60px;">
          </colgroup>
          <thead>
            <tr>
              <th style="${thLabelStyle}">Line item</th>
              ${headerCells}
              ${totalHeader}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`
  }

  // ── Year 2 quarterly table ────────────────────────────────────────────────
  function buildYear2Table(): string {
    const cols = [...quarterlyColumns.value, 'Annual Total']
    const thBase = 'padding:4px 8px;font-size:10px;font-weight:600;text-align:right;white-space:nowrap;background:#1e3a5f;color:#fff;'
    const thLabelStyle = 'padding:4px 10px;font-size:10px;font-weight:600;text-align:left;background:#1e3a5f;color:#fff;'

    const headerCells = cols
      .map((c) => `<th style="${thBase}">${esc(c)}</th>`)
      .join('')

    const bodyRows = quarterlyRows.value
      .map((row) => {
        const isAggregate = (row as any).isAggregate
        const rowBg = isAggregate ? '#f0f9ff' : '#fff'
        const fw    = isAggregate ? '700' : '400'
        const indent = isAggregate ? '' : 'padding-left:20px;'

        const labelCell = `<td style="padding:4px 10px;font-size:9px;font-weight:${fw};background:${rowBg};white-space:nowrap;${indent}">${esc(row.label)}</td>`

        const valCells = row.values.map((v) => {
          const n = typeof v === 'number' ? v : parseFloat(v as string)
          const color = isFinite(n) && n < 0 ? 'color:#dc2626;' : ''
          return `<td style="padding:4px 8px;font-size:9px;text-align:right;background:${rowBg};${color}font-weight:${fw};">${fmt(n)}</td>`
        }).join('')

        // Annual total = sum of quarterly values
        const total = row.values.reduce<number>((acc, v) => {
          const n = typeof v === 'number' ? v : parseFloat(v as string)
          return acc + (isFinite(n) ? n : 0)
        }, 0)
        const totalColor = total < 0 ? 'color:#dc2626;' : ''
        const totalCell = `<td style="padding:4px 10px;font-size:9px;text-align:right;font-weight:700;background:${rowBg};${totalColor}border-left:1px solid #cbd5e1;">${fmt(total)}</td>`

        return `<tr>${labelCell}${valCells}${totalCell}</tr>`
      })
      .join('')

    return `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 8px 0;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">
          Year 2 Budget — Quarterly P&L
        </h2>
        <table style="border-collapse:collapse;width:60%;table-layout:fixed;">
          <colgroup>
            <col style="width:200px;">
            ${cols.map(() => '<col style="width:90px;">').join('')}
          </colgroup>
          <thead>
            <tr>
              <th style="${thLabelStyle}">Line item</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`
  }

  const now = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
  const planName = planStore.activePlan?.name ?? ''

  const html = `<!DOCTYPE html>
<html lang="${esc(locale.slice(0, 2))}">
<head>
  <meta charset="UTF-8">
  <title>Budget</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 3px solid #1e3a5f; }
    .header h1 { font-size: 16px; font-weight: 800; color: #1e3a5f; }
    .header .meta { font-size: 9px; color: #64748b; text-align: right; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Budget${planName ? ` — ${esc(planName)}` : ''}</h1>
    <div class="meta">Generated ${esc(now)}</div>
  </div>
  ${buildYear1Table()}
  ${buildYear2Table()}
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=800')
  if (!win) return
  win.opener = null // the print window never needs a handle back to the app
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => {
    win.focus()
    win.print()
  })
}

// ── DEV audit trail ───────────────────────────────────────────────────────────
function downloadBudgetAuditTrail() {
  // Normalise overrides: the store should always hold BudgetMonthlyOverride[],
  // but defensively unwrap in case a stale bundle stored the raw PagedResponse.
  const rawOverrides = budgetStore.overrides as unknown
  const overridesArray: unknown[] = Array.isArray(rawOverrides)
    ? rawOverrides
    : Array.isArray((rawOverrides as any)?.data)
      ? (rawOverrides as any).data
      : []

  const payload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: 'BudgetView audit trail (DEV)',
    },
    budget1Report: budgetStore.budget1Report,
    budget2Report: budgetStore.budget2Report,
    overrides: overridesArray,
    derived: {
      monthGridRows: monthGridRows.value,
      quarterlyRows: quarterlyRows.value,
      quarterlyColumns: quarterlyColumns.value,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-audit-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Budget</h1>
      <div class="flex items-center gap-3">
        <!-- DEV ONLY — remove before production -->
        <button
          v-if="budgetStore.budget1Report"
          title="DEV: download full budget audit trail as JSON"
          @click="downloadBudgetAuditTrail"
          style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; font-size:0.72rem; font-weight:600; color:#92400e; background:#fef3c7; border:1px dashed #f59e0b; border-radius:6px; cursor:pointer; letter-spacing:0.04em"
        >
          <span>⬇ DEV</span>
          <span style="font-weight:400; color:#b45309">audit trail</span>
        </button>
        <button
          @click="exportBudgetPDF"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Export PDF
        </button>
      </div>
    </div>

    <div v-if="budgetStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <Tabs v-else :value="activeTab" @update:value="(v: any) => activeTab = v">
      <TabList>
        <Tab value="year1">Year 1 Budget (Monthly)</Tab>
        <Tab value="year2">Year 2 Budget (Quarterly)</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="year1">
          <div class="mt-4">
            <p class="text-sm text-gray-600 mb-4">
              Monthly P&amp;L budget with editable overrides. Shows sections for revenue, cost of goods sold, and operating expenses.
            </p>
            <DataContainer min-width="900px">
              <KMonthGrid
                v-if="monthGridRows.length > 0"
                :years="gridYears"
                :rows="monthGridRows"
                @cell-edit="onCellEdit"
              />
              <div v-else class="text-center py-12 text-gray-500">
                No budget data available.
              </div>
            </DataContainer>
          </div>
        </TabPanel>

        <TabPanel value="year2">
          <div class="mt-4">
            <p class="text-sm text-gray-600 mb-4">
              Year 2 quarterly P&amp;L budget (read-only). Shows Q1, Q2, Q3, Q4, and annual total.
            </p>
            <DataContainer min-width="700px">
              <KYearGrid
                v-if="quarterlyRows.length > 0"
                :rows="quarterlyRows"
                :unit="unitLabel"
                :columnHeaders="quarterlyColumns"
                showTotal
                totalLabel="Annual Total"
              />
              <div v-else class="text-center py-12 text-gray-500">
                No budget data available.
              </div>
            </DataContainer>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
