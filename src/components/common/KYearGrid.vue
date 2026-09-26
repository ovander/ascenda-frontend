<script setup lang="ts">
import { computed } from 'vue'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import { debounce } from '@/utils/format'

export interface GridRow {
  id: string
  label: string
  values: (string | number)[]
  editable?: boolean
  isComputed?: boolean
  isAggregate?: boolean
  isSubtotal?: boolean
  suffix?: string
  decimals?: number
  /**
   * What the values are, which decides how the €/k€/M€ display unit applies:
   * - 'amount' (default): base-€ amounts, divided by the display factor and
   *   labelled €, k€ or M€ (a '€' suffix follows the display unit);
   * - 'quantity': counts and ratios (volumes, FTE, coefficients), shown as
   *   stored;
   * - 'percent': fractions (0.2), shown and entered as percentages (20 %).
   */
  kind?: 'amount' | 'quantity' | 'percent'
  group?: string
  tooltip?: string
  /** When true, cell text is rendered red for negative values and green for positive. */
  colorBySign?: boolean
  /**
   * Optional per-year badge labels (one entry per year, null/undefined = no badge).
   * Shown as a small chip below the cell value. Used, e.g., to indicate that a
   * capital_increase cell is linked to a cap table round.
   * Pass a string for the default (indigo) variant, or an object for a warning variant.
   */
  cellBadges?: (string | { label: string; warning: boolean } | null | undefined)[]
  /**
   * Optional per-year action buttons (one entry per year, null/undefined = no button).
   * Shown as a small clickable button below the cell value, mutually exclusive with
   * cellBadges (button is hidden when a badge is present for the same year).
   */
  cellButtons?: ({ label: string; icon?: string } | null | undefined)[]
}

const props = withDefaults(defineProps<{
  rows: GridRow[]
  showTotal?: boolean
  totalLabel?: string
  totalValues?: (string | number)[]
  locale?: string
  groupBy?: boolean
  columnHeaders?: string[]   // override yearHeaders (e.g. ['Q1','Q2','Q3','Q4'])
  unit?: string              // e.g. 'k€' — shown in column headers and on editable cells
  readonly?: boolean         // when true, disable all input fields and cell buttons
}>(), {
  showTotal: false,
  totalLabel: 'Total',
  groupBy: false,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'cell-edit', payload: { rowId: string; yearIndex: number; value: number }): void
  (e: 'cell-button-click', payload: { rowId: string; yearIndex: number }): void
}>()

function badgeLabel(badge: string | { label: string; warning: boolean } | null | undefined): string {
  if (!badge) return ''
  return typeof badge === 'string' ? badge : badge.label
}
function badgeIsWarning(badge: string | { label: string; warning: boolean } | null | undefined): boolean {
  if (!badge) return false
  return typeof badge === 'object' && badge.warning
}

const { yearHeaders: defaultYearHeaders } = useYearHeaders()
const activeHeaders = computed(() => props.columnHeaders ?? defaultYearHeaders.value)
const { formatUnit, getLocale } = useDecimal()
const activeLocale = computed(() => props.locale ?? getLocale())
const displayUnitStore = useDisplayUnitStore()

const debouncedEmit = debounce((rowId: string, yearIndex: number, value: number) => {
  emit('cell-edit', { rowId, yearIndex, value })
}, 300)

function onCellEdit(row: GridRow, yearIndex: number, value: number) {
  row.values[yearIndex] = value
  debouncedEmit(row.id, yearIndex, value)
}

function getRowClass(row: GridRow) {
  if (row.isAggregate) return 'row-aggregate'
  if (row.isSubtotal) return 'row-subtotal'
  return ''
}

function getCellClass(row: GridRow) {
  if (!row.editable) return 'cell-computed'
  return 'cell-input'
}

function numValue(val: string | number): number {
  if (typeof val === 'number') return val
  return parseFloat(val) || 0
}

// ── Display unit per row kind ────────────────────────────────────────────────
// Stored value = displayed value × scale.
function scaleOf(row: GridRow): number {
  if (row.kind === 'quantity') return 1
  if (row.kind === 'percent') return 0.01
  return displayUnitStore.factor
}

function displayed(row: GridRow, val: string | number): number {
  return numValue(val) / scaleOf(row)
}

function onInput(row: GridRow, idx: number, v: number | null) {
  onCellEdit(row, idx, (v ?? 0) * scaleOf(row))
}

function maxDigits(row: GridRow): number {
  const own = row.decimals ?? (row.kind === 'amount' || !row.kind ? 0 : 2)
  return row.kind === 'quantity' || row.kind === 'percent' ? own : Math.max(own, displayUnitStore.decimals)
}

/** Unit shown after a value: a '€' suffix follows the display unit (€, k€, M€). */
function suffixOf(row: GridRow): string | undefined {
  if (row.kind === 'percent') return '%'
  if (row.suffix === '€' && row.kind !== 'quantity') return displayUnitStore.unit
  return row.suffix
}

function formatCell(row: GridRow, val: string | number): string {
  if (row.kind === 'quantity' || row.kind === 'percent') {
    const d = row.decimals ?? (row.kind === 'percent' ? 1 : 0)
    return displayed(row, val).toLocaleString(activeLocale.value, { minimumFractionDigits: d, maximumFractionDigits: d })
  }
  return formatUnit(val)
}

function getSignClass(row: GridRow, val: string | number): string {
  if (!row.colorBySign) return ''
  const n = numValue(val)
  if (n < 0) return 'text-red-600 font-medium'
  if (n > 0) return 'text-green-700 font-medium'
  return ''
}
</script>

<template>
  <div>
  <div v-if="unit" class="flex justify-end mb-1">
    <span class="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-sm px-2 py-0.5 font-medium">
      Amounts in {{ unit }}
    </span>
  </div>
  <DataTable
    :value="rows"
    dataKey="id"
    class="p-datatable-sm p-datatable-gridlines"
    :rowGroupMode="groupBy ? 'subheader' : undefined"
    :groupRowsBy="groupBy ? 'group' : undefined"
    :scrollable="true"
    scrollHeight="flex"
    showGridlines
    size="small"
  >
    <Column field="label" header="" frozen class="min-w-[200px] font-medium" :style="{ width: '250px' }">
      <template #body="{ data }">
        <span :class="{ 'font-bold': data.isAggregate, 'font-semibold': data.isSubtotal, 'pl-4': !data.isAggregate && !data.isSubtotal }" class="inline-flex items-center gap-1">
          {{ data.label }}
          <i v-if="!data.editable && !data.isAggregate && !data.isSubtotal" class="pi pi-lock text-xs text-gray-400"></i>
          <i
            v-if="data.tooltip"
            class="pi pi-info-circle text-xs text-blue-400 cursor-help"
            v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
          ></i>
        </span>
      </template>
    </Column>

    <Column
      v-for="(header, idx) in activeHeaders"
      :key="idx"
      class="text-right min-w-[120px]"
      :style="{ width: '140px' }"
    >
      <template #header>
        <div class="text-right w-full">{{ header }}</div>
      </template>
      <template #body="{ data }">
        <div :class="['px-2 py-1 text-right rounded-sm', getCellClass(data), getRowClass(data)]">
          <InputNumber
            v-if="data.editable"
            :modelValue="displayed(data, data.values[idx])"
            @update:modelValue="(v: number | null) => onInput(data, idx, v)"
            :minFractionDigits="Math.min(data.decimals ?? 0, maxDigits(data))"
            :maxFractionDigits="maxDigits(data)"
            :locale="activeLocale"
            mode="decimal"
            class="w-full text-right"
            inputClass="text-right w-full p-1 text-sm"
:suffix="suffixOf(data) ? ` ${suffixOf(data)}` : (unit ? ` ${unit}` : undefined)"
            :readonly="readonly"
            :disabled="readonly"
          />
          <span v-else class="text-sm" :class="getSignClass(data, data.values[idx] ?? 0)">
            {{ formatCell(data, data.values[idx] ?? 0) }}
            <span v-if="suffixOf(data)" class="text-gray-400 text-xs ml-0.5">{{ suffixOf(data) }}</span>
          </span>
          <!-- Cap table link badge (or any per-cell annotation) -->
          <div
            v-if="data.cellBadges && data.cellBadges[idx]"
            class="mt-0.5 flex justify-end"
          >
            <!-- Warning variant (divergent sync) -->
            <span
              v-if="badgeIsWarning(data.cellBadges[idx])"
              class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300"
              v-tooltip.bottom="{ value: `Cap table round amount has changed — click Re-sync to update`, showDelay: 150 }"
            >
              <i class="pi pi-exclamation-triangle" style="font-size: 9px"></i>
              {{ badgeLabel(data.cellBadges[idx]) }}
            </span>
            <!-- Default variant (linked, in sync) -->
            <span
              v-else
              class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200"
              v-tooltip.bottom="{ value: `Linked to cap table round: ${badgeLabel(data.cellBadges[idx])}`, showDelay: 150 }"
            >
              <i class="pi pi-link" style="font-size: 9px"></i>
              {{ badgeLabel(data.cellBadges[idx]) }}
            </span>
          </div>
          <!-- Per-cell action button (shown only when no badge is present and not readonly) -->
          <div
            v-if="!readonly && data.cellButtons && data.cellButtons[idx]"
            class="mt-0.5 flex justify-end"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer"
              @click.stop="emit('cell-button-click', { rowId: data.id, yearIndex: idx })"
            >
              <i v-if="data.cellButtons[idx]!.icon" :class="['pi', data.cellButtons[idx]!.icon]" style="font-size: 9px"></i>
              {{ data.cellButtons[idx]!.label }}
            </button>
          </div>
        </div>
      </template>
    </Column>

    <template #groupheader="{ data }" v-if="groupBy">
      <span class="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        {{ data.group }}
      </span>
    </template>

    <template #footer v-if="showTotal && totalValues">
      <tr class="font-bold bg-gray-200">
        <td class="px-3 py-2">{{ totalLabel }}</td>
        <td v-for="(val, idx) in totalValues" :key="idx" class="px-3 py-2 text-right">
          {{ formatUnit(val) }}
        </td>
      </tr>
    </template>
  </DataTable>
  </div>
</template>
