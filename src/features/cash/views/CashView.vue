<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useCashStore } from '@/features/cash/stores/cashStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import KMonthGrid from '@/components/common/KMonthGrid.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import type { MonthGridRow } from '@/components/common/KMonthGrid.vue'

defineProps<{ planId?: string; sid?: string }>()

const cashStore = useCashStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()
const { yearHeaders, monthHeaders } = useYearHeaders()
const { formatUnit, getLocale } = useDecimal()

const activeYear = ref(0)
const monthGridRows = ref<MonthGridRow[][]>([])

const gridYears = computed(() => {
  return Math.min(3, yearHeaders.value.length)
})

// Per-year, per-month liquidity issues: which months have a negative closing balance.
interface LiquidityIssue {
  yearIndex: number
  yearLabel: string
  negativeMonths: number[]   // 0-based month indices (0 = Jan)
}

const liquidityIssues = computed<LiquidityIssue[]>(() => {
  const report = cashStore.report
  if (!report) return []
  return report.years
    .map((y, i) => {
      const negativeMonths = y.closingBalance
        .map((v, m) => ({ m, n: parseFloat(v ?? '0') }))
        .filter(({ n }) => isFinite(n) && n < 0)
        .map(({ m }) => m)
      return {
        yearIndex: y.yearIndex,
        yearLabel: yearHeaders.value[i] ?? `Year ${y.yearIndex}`,
        negativeMonths,
      }
    })
    .filter((issue) => issue.negativeMonths.length > 0)
})

// Keep legacy alias so existing template references still compile
const errorSections = liquidityIssues

onMounted(async () => {
  if (planStore.activePlan && settingsStore.config) {
    await Promise.all([cashStore.fetchOverrides(), cashStore.fetchReport()])

    // Build month grid rows from report
    if (cashStore.report?.years) {
      monthGridRows.value = cashStore.report.years.map((yearData) => {
        const rows: MonthGridRow[] = []

        // Revenue section
        if (yearData.revenue.lines) {
          rows.push({ group: 'Revenue', label: 'Revenue', id: '', months: [], annualTotal: 0,
            tooltip: 'Monthly cash receipts from customer collections. Each line corresponds to a revenue stream; the monthly split follows the payment schedule configured in Settings.' })
          yearData.revenue.lines.forEach((line) => {
            rows.push({
              id: `cash-revenue-${line.lineId}`,
              label: line.label,
              months: line.months.map((m) => parseFloat(m) || 0),
              annualTotal: line.annualTotal,
              editable: true,
              distributionRule: line.distributionRule,
              tooltip: `Monthly cash inflow for "${line.label}". Distributed across months using the rule shown. Override individual months by editing the cells directly.`,
            })
          })
        }

        // Operating section
        if (yearData.operating.lines) {
          rows.push({ group: 'Operating', label: 'Operating Expenses', id: '', months: [], annualTotal: 0,
            tooltip: 'Monthly cash outflows for operating expenses. Values flow from the OPEX module; distribution across months follows the rule assigned to each line.' })
          yearData.operating.lines.forEach((line) => {
            rows.push({
              id: `cash-opex-${line.lineId}`,
              label: line.label,
              months: line.months.map((m) => parseFloat(m) || 0),
              annualTotal: line.annualTotal,
              editable: true,
              distributionRule: line.distributionRule,
              tooltip: `Monthly cash payment for "${line.label}" operating expense. The distribution rule (shown as a badge) controls how the annual amount is spread across months.`,
            })
          })
        }

        // Capex section
        if (yearData.capex.lines) {
          rows.push({ group: 'Capex', label: 'Capital Expenditure', id: '', months: [], annualTotal: 0,
            tooltip: 'Monthly cash disbursements for capital investments. Timing comes from the Capex module schedule. Capex outflows reduce cash but appear as assets on the balance sheet.' })
          yearData.capex.lines.forEach((line) => {
            rows.push({
              id: `cash-capex-${line.lineId}`,
              label: line.label,
              months: line.months.map((m) => parseFloat(m) || 0),
              annualTotal: line.annualTotal,
              editable: true,
              distributionRule: line.distributionRule,
              tooltip: `Monthly cash disbursement for capital investment "${line.label}". Flows directly from the Capex module investment schedule.`,
            })
          })
        }

        // Financing section
        if (yearData.financing.lines) {
          rows.push({ group: 'Financing', label: 'Financing', id: '', months: [], annualTotal: 0,
            tooltip: 'Monthly cash movements from financing activities: equity raises, new loan drawdowns, and loan repayments. Values come from the Financial Plan module.' })
          yearData.financing.lines.forEach((line) => {
            rows.push({
              id: `cash-financing-${line.lineId}`,
              label: line.label,
              months: line.months.map((m) => parseFloat(m) || 0),
              annualTotal: line.annualTotal,
              editable: true,
              distributionRule: line.distributionRule,
              tooltip: `Monthly cash flow for financing instrument "${line.label}". Positive = inflow (equity raise or loan drawdown); negative = outflow (loan repayment).`,
            })
          })
        }

        // Cash flow summary
        rows.push({
          id: 'cash-net-flow',
          label: 'Net Cash Flow',
          months: yearData.netCashFlow.map((v) => parseFloat(v) || 0),
          annualTotal: yearData.netCashFlow.reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
          isComputed: true,
          tooltip: 'Total cash inflows minus outflows for the month (Revenue + Financing − Operating − Capex). Positive = net cash generated; negative = net cash consumed.',
        })

        rows.push({
          id: 'cash-opening',
          label: 'Opening Balance',
          months: yearData.openingBalance.map((v) => parseFloat(v) || 0),
          annualTotal: yearData.openingBalance[0] || 0,
          isComputed: true,
          tooltip: 'Cash balance at the start of the month. Equals the closing balance of the previous month. For Month 1 of Year 1, this is the initial cash balance set in Settings.',
        })

        rows.push({
          id: 'cash-closing',
          label: 'Closing Balance',
          months: yearData.closingBalance.map((v) => parseFloat(v) || 0),
          annualTotal: yearData.closingBalance[yearData.closingBalance.length - 1] || 0,
          isComputed: true,
          tooltip: 'Cash balance at month-end = Opening Balance + Net Cash Flow. Negative values (highlighted in red) indicate a liquidity shortfall — additional financing must be arranged to cover this gap.',
        })

        return rows
      })
    }
  }
})

async function onCellEdit(payload: any) {
  const { rowId, yearIndex, month, value } = payload
  // This would update the override in the store and trigger a debounced API call
  // Implementation would depend on backend persistence model
}

function exportCashFlow() {
  if (!monthGridRows.value.length) return

  const locale = getLocale()
  const currency = settingsStore.config?.currency ?? 'EUR'

  // Format a number as compact currency (e.g. 1 234 €)
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
  const years  = yearHeaders.value   // ['2025','2026','2027', ...]

  // Pre-compute negative-closing months per year index (0-based)
  const negativeMonthsPerYear: Set<number>[] = monthGridRows.value
    .slice(0, gridYears.value)
    .map((rows) => {
      const closingRow = rows.find((r) => r.id === 'cash-closing')
      if (!closingRow) return new Set<number>()
      return new Set(
        closingRow.months
          .map((v, m) => ({ m, n: typeof v === 'string' ? parseFloat(v as string) : (v as number) }))
          .filter(({ n }) => isFinite(n) && n < 0)
          .map(({ m }) => m),
      )
    })

  // Build one <table> per year
  function buildYearTable(
    rows: typeof monthGridRows.value[number],
    yearLabel: string,
    badMonths: Set<number>,
  ): string {
    const thBase = 'padding:4px 6px;font-size:9px;font-weight:600;text-align:right;white-space:nowrap;'
    const thLabelStyle = 'padding:4px 8px;font-size:9px;font-weight:600;text-align:left;background:#1e3a5f;color:#fff;'

    // Column headers — flag bad months with ⚠ and orange background
    const headerCells = months.map((m, i) => {
      const isBad = badMonths.has(i)
      const bg = isBad ? '#7f1d1d' : '#1e3a5f'
      const label = isBad ? `${m}&nbsp;⚠` : m
      return `<th style="${thBase}background:${bg};color:#fff;">${label}</th>`
    }).join('')
    const totalHeader = `<th style="${thBase}background:#1e3a5f;color:#fff;">Total</th>`

    // Alert banner listing the specific bad months
    const alertBanner = badMonths.size > 0
      ? `<div style="margin-bottom:6px;padding:5px 10px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;font-size:8.5px;color:#7f1d1d;">
           <strong>⚠ Liquidity alert:</strong> negative closing balance in
           ${[...badMonths].sort((a, b) => a - b).map((m) => months[m]).join(', ')}
         </div>`
      : ''

    const bodyRows = rows.map((row) => {
      if (!row.id) {
        // Section header row
        return `<tr>
          <td colspan="${months.length + 2}" style="padding:5px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:#e8f0fe;color:#1e3a5f;border-top:1px solid #c3d3ee;">
            ${row.label}
          </td>
        </tr>`
      }

      const isComputed = row.isComputed
      const isClosing  = row.id === 'cash-closing'
      const isOpening  = row.id === 'cash-opening'
      const isNet      = row.id === 'cash-net-flow'

      const rowBg = isClosing
        ? '#dbeafe'
        : isOpening || isNet
          ? '#f0f9ff'
          : isComputed
            ? '#f8fafc'
            : '#fff'
      const fw = (isClosing || isNet) ? '700' : '400'
      const borderTop = isNet ? 'border-top:2px solid #1e3a5f;' : ''

      const labelCell = `<td style="padding:3px 8px;font-size:8.5px;font-weight:${fw};${borderTop}background:${rowBg};white-space:nowrap;">${row.label}</td>`

      const mCells = row.months.map((v, mi) => {
        const n = typeof v === 'string' ? parseFloat(v as string) : (v as number)
        // For Closing Balance row: shade negative cells red; for other rows in a bad month: subtle tint
        let cellBg = rowBg
        if (isClosing && badMonths.has(mi)) {
          cellBg = '#fee2e2'
        } else if (!isClosing && badMonths.has(mi) && !isComputed) {
          cellBg = '#fff8f8'
        }
        const color = isFinite(n) && n < 0 ? 'color:#dc2626;' : ''
        return `<td style="padding:3px 6px;font-size:8px;text-align:right;${borderTop}background:${cellBg};${color}font-weight:${fw};">${fmt(n)}</td>`
      }).join('')

      const total = typeof row.annualTotal === 'string' ? parseFloat(row.annualTotal) : (row.annualTotal as number)
      const totalColor = isFinite(total) && total < 0 ? 'color:#dc2626;' : ''
      const totalCell = `<td style="padding:3px 8px;font-size:8px;text-align:right;font-weight:700;${borderTop}background:${rowBg};${totalColor}border-left:1px solid #cbd5e1;">${fmt(total)}</td>`

      return `<tr>${labelCell}${mCells}${totalCell}</tr>`
    }).join('')

    return `
      <div style="margin-bottom:32px;page-break-after:always;">
        <h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 6px 0;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">
          Cash Flow Statement — ${yearLabel}
        </h2>
        ${alertBanner}
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
          <colgroup>
            <col style="width:130px;">
            ${months.map(() => '<col style="width:56px;">').join('')}
            <col style="width:64px;">
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

  const tablesHtml = monthGridRows.value
    .slice(0, gridYears.value)
    .map((rows, i) => buildYearTable(rows, years[i] ?? `Year ${i + 1}`, negativeMonthsPerYear[i] ?? new Set()))
    .join('')

  const now = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="${locale.slice(0, 2)}">
<head>
  <meta charset="UTF-8">
  <title>Cash Flow Statement</title>
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
    <h1>Cash Flow Statement</h1>
    <div class="meta">Generated ${now}</div>
  </div>
  ${tablesHtml}
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=800')
  if (!win) return
  win.document.write(html)
  win.document.close()
  // Small delay lets the browser finish rendering before the print dialog opens
  win.addEventListener('load', () => {
    win.focus()
    win.print()
  })
}

// ── DEV audit trail ──────────────────────────────────────────────────────────
function downloadAuditTrail() {
  if (!cashStore.report) return
  const r = cashStore.report
  const payload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: 'CashView audit trail (DEV)',
    },
    report: {
      years: r.years.map((y) => ({
        yearIndex: y.yearIndex,
        netCashFlow: y.netCashFlow,
        openingBalance: y.openingBalance,
        closingBalance: y.closingBalance,
        revenue: {
          total: y.revenue.total,
          lines: y.revenue.lines.map((l) => ({
            lineId: l.lineId,
            label: l.label,
            annualTotal: l.annualTotal,
            months: l.months,
            distributionRule: l.distributionRule,
          })),
        },
        operating: {
          total: y.operating.total,
          lines: y.operating.lines.map((l) => ({ lineId: l.lineId, label: l.label, annualTotal: l.annualTotal, months: l.months })),
        },
        capex: {
          total: y.capex.total,
          lines: y.capex.lines.map((l) => ({ lineId: l.lineId, label: l.label, annualTotal: l.annualTotal, months: l.months })),
        },
        financing: {
          total: y.financing.total,
          lines: y.financing.lines.map((l) => ({ lineId: l.lineId, label: l.label, annualTotal: l.annualTotal, months: l.months })),
        },
        economic: { total: (y as any).economic?.total },
        tax: { total: (y as any).tax?.total },
      })),
    },
    overrides: cashStore.overrides,
    derived: {
      monthGridRows: monthGridRows.value,
      errorSections: errorSections.value,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cash-audit-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Cash Flow Statement</h1>
      <div class="flex items-center gap-3">
        <!-- DEV ONLY — remove before production -->
        <button
          v-if="cashStore.report"
          title="DEV: download full cash flow audit trail as JSON"
          @click="downloadAuditTrail"
          style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; font-size:0.72rem; font-weight:600; color:#92400e; background:#fef3c7; border:1px dashed #f59e0b; border-radius:6px; cursor:pointer; letter-spacing:0.04em"
        >
          <span>⬇ DEV</span>
          <span style="font-weight:400; color:#b45309">audit trail</span>
        </button>
        <button
          @click="exportCashFlow"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Export PDF
        </button>
      </div>
    </div>

    <KFormLegend
      variant="grid"
      description="Month-by-month cash flow model showing opening balance, operating inflows/outflows, capex, and financing movements. All amounts in thousands. A negative closing balance flags a liquidity gap — review your Financing Plan to cover it."
      :extras="[{ icon: 'pi-exclamation-triangle', text: 'Red row = negative closing cash — financing required that month' }]"
    />

    <div v-if="liquidityIssues.length > 0" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
      <p class="text-red-700 font-semibold text-sm">⚠ Negative closing balance detected</p>
      <p
        v-for="issue in liquidityIssues"
        :key="issue.yearIndex"
        class="text-sm text-red-600"
      >
        <span class="font-medium">{{ issue.yearLabel }}:</span>
        {{ issue.negativeMonths.map((m) => monthHeaders[m]).join(', ') }}
      </p>
    </div>

    <div v-if="cashStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else-if="monthGridRows.length > 0">
      <KMonthGrid
        :years="gridYears"
        :rows="monthGridRows"
        @cell-edit="onCellEdit"
      />
    </div>

    <div v-else class="text-center py-12 text-gray-500">
      No cash flow data available. Please configure the scenario.
    </div>
  </div>
</template>

<style scoped>
:deep(.row-closed-negative) {
  background-color: rgba(239, 68, 68, 0.1);
  color: #7f1d1d;
}
</style>
