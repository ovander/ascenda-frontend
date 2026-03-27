<script setup lang="ts">
import { ref, computed } from 'vue'
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
import Tag from 'primevue/tag'
import { debounce } from '@/utils/format'

export interface MonthGridRow {
  id: string
  label: string
  months: (string | number)[]  // 12 values
  annualTotal: string | number
  editable?: boolean
  isComputed?: boolean
  distributionRule?: 'even' | 'lump_m1' | 'from_schedule' | 'manual'
  group?: string
  tooltip?: string
}

const props = withDefaults(defineProps<{
  years: number  // number of year tabs (1-3)
  rows: MonthGridRow[][]  // rows per year
  locale?: string
}>(), {
  years: 3,
})

const emit = defineEmits<{
  (e: 'cell-edit', payload: { rowId: string; yearIndex: number; month: number; value: number }): void
}>()

const { yearHeaders, monthHeaders } = useYearHeaders()
const { formatUnit, getLocale } = useDecimal()
const activeLocale = computed(() => props.locale ?? getLocale())

const activeYear = ref(0)

const debouncedEmit = debounce((rowId: string, yearIndex: number, month: number, value: number) => {
  emit('cell-edit', { rowId, yearIndex, month, value })
}, 300)

function onCellEdit(row: MonthGridRow, yearIndex: number, month: number, value: number) {
  row.months[month] = value
  debouncedEmit(row.id, yearIndex, month, value)
}

function numValue(val: string | number): number {
  if (typeof val === 'number') return val
  return parseFloat(val) || 0
}

function isNegative(val: string | number | undefined): boolean {
  if (val === undefined || val === null || val === '') return false
  const n = typeof val === 'number' ? val : parseFloat(val as string)
  return isFinite(n) && n < 0
}

function getRuleSeverity(rule?: string) {
  switch (rule) {
    case 'manual': return 'warn'
    case 'even': return 'info'
    case 'lump_m1': return 'secondary'
    default: return 'info'
  }
}
</script>

<template>
  <Tabs :value="activeYear" @update:value="(v: any) => activeYear = v">
    <TabList>
      <Tab v-for="yearIdx in years" :key="yearIdx - 1" :value="yearIdx - 1">
        {{ yearHeaders[yearIdx - 1] || `Year ${yearIdx}` }}
      </Tab>
    </TabList>
    <TabPanels>
    <TabPanel
      v-for="yearIdx in years"
      :key="yearIdx - 1"
      :value="yearIdx - 1"
    >
      <DataTable
        :value="rows[yearIdx - 1] || []"
        class="p-datatable-sm p-datatable-gridlines"
        scrollable
        scrollHeight="500px"
        showGridlines
        size="small"
      >
        <Column field="label" header="" frozen class="min-w-[180px]" :style="{ width: '200px' }">
          <template #body="{ data }">
            <div class="inline-flex items-center gap-1">
              <span class="text-sm font-medium">{{ data.label }}</span>
              <i
                v-if="data.tooltip"
                class="pi pi-info-circle text-xs text-blue-400 cursor-help"
                v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
              />
              <Tag
                v-if="data.distributionRule"
                :value="data.distributionRule"
                :severity="getRuleSeverity(data.distributionRule)"
                class="text-xs ml-1"
              />
            </div>
          </template>
        </Column>

        <Column
          v-for="(month, mIdx) in monthHeaders"
          :key="mIdx"
          :header="month"
          class="text-right"
          :style="{ width: '90px', minWidth: '80px' }"
        >
          <template #body="{ data }">
            <InputNumber
              v-if="data.editable"
              :modelValue="numValue(data.months[mIdx])"
              @update:modelValue="(v: number) => onCellEdit(data, yearIdx - 1, mIdx, v ?? 0)"
              :maxFractionDigits="0"
              :locale="activeLocale"
              mode="decimal"
              class="w-full"
              :inputClass="['text-right w-full p-1 text-xs', isNegative(data.months[mIdx]) ? 'text-red-600 font-medium' : ''].join(' ')"
            />
            <span
              v-else
              class="text-xs text-right block px-1"
              :class="{ 'text-red-600 font-medium': isNegative(data.months[mIdx]) }"
            >
              {{ formatUnit(data.months[mIdx] ?? 0) }}
            </span>
          </template>
        </Column>

        <Column header="Total" class="text-right font-bold" :style="{ width: '100px' }">
          <template #body="{ data }">
            <span
              class="text-sm font-bold"
              :class="{ 'text-red-600': isNegative(data.annualTotal) }"
            >
              {{ formatUnit(data.annualTotal) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </TabPanel>
    </TabPanels>
  </Tabs>
</template>
