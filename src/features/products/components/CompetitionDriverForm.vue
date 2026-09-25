<script setup lang="ts">
/**
 * CompetitionDriverForm.vue — parameters of the 'competition' driver
 * (athlete prize money): results per year, the tour's prize economics, the
 * per-event costs (entry, travel, caddie fee and share) and the coach
 * (annual fee plus a share of winnings). Shows the resulting prize money and
 * costs per year, and warns about impossible results before they are saved.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import KFieldLabel from '@/components/common/KFieldLabel.vue'
import { useDecimal } from '@/composables/useDecimal'
import type { CompetitionParams } from '@/types'
import {
  CIRCUIT_PRESETS,
  YEARS,
  competitionCosts,
  competitionGains,
  competitionIssues,
  normalizeCompetition,
  type CircuitRegion,
} from '../utils/athleteDrivers'

const props = defineProps<{ modelValue: CompetitionParams }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: CompetitionParams): void }>()
const { t } = useI18n()
const { formatCurrency } = useDecimal()

const YEAR_LABELS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5']
const CUSTOM = 'custom'
const REGIONS: CircuitRegion[] = ['europe', 'us']

// Parameters saved by earlier versions (coach fee per event) are shown and
// edited in the current shape; the converted version is saved on load.
const params = computed(() => normalizeCompetition(props.modelValue))
onMounted(() => {
  if (params.value !== props.modelValue) emit('update:modelValue', params.value)
})

type EditableField = Exclude<keyof CompetitionParams, 'coachFeePerEvent'>
type CountField = 'events' | 'cuts' | 'top10s' | 'wins'
type MoneyField = Exclude<EditableField, CountField | 'circuit'>

interface Row { field: MoneyField; key: string; share?: boolean }

const countRows: { field: CountField; key: string }[] = [
  { field: 'events', key: 'events' },
  { field: 'cuts', key: 'cuts' },
  { field: 'top10s', key: 'top10s' },
  { field: 'wins', key: 'wins' },
]
const moneySections: { key: string; rows: Row[] }[] = [
  {
    key: 'prizes',
    rows: [
      { field: 'prizePerWin', key: 'prizePerWin' },
      { field: 'prizePerTop10', key: 'prizePerTop10' },
      { field: 'prizePerCut', key: 'prizePerCut' },
      { field: 'otherPrizeMoney', key: 'otherPrizeMoney' },
    ],
  },
  {
    key: 'costs',
    rows: [
      { field: 'entryFeePerEvent', key: 'entryFeePerEvent' },
      { field: 'travelPerEvent', key: 'travelPerEvent' },
      { field: 'caddieFeePerEvent', key: 'caddieFeePerEvent' },
      { field: 'caddieShare', key: 'caddieShare', share: true },
    ],
  },
  {
    key: 'coach',
    rows: [
      { field: 'coachAnnualFee', key: 'coachAnnualFee' },
      { field: 'coachShare', key: 'coachShare', share: true },
    ],
  },
]

const circuitGroups = computed(() => [
  ...REGIONS.map((region) => ({
    label: t(`products.driver.competition.region.${region}`),
    items: CIRCUIT_PRESETS.filter((p) => p.region === region).map((p) => ({ value: p.id, label: p.name })),
  })),
  {
    label: t('products.driver.competition.region.other'),
    items: [{ value: CUSTOM, label: t('products.driver.competition.customValues') }],
  },
])

function circuitValue(y: number): string {
  return CIRCUIT_PRESETS.find((p) => p.name === params.value.circuit[y])?.id ?? CUSTOM
}

function withYear<K extends EditableField>(
  base: CompetitionParams, field: K, y: number, value: CompetitionParams[K][number],
): CompetitionParams {
  const arr = [...base[field]] as CompetitionParams[K]
  arr[y] = value
  return { ...base, [field]: arr }
}

/** Selecting a tour fills the year's prize economics; custom keeps them. */
function selectCircuit(y: number, id: string) {
  const preset = CIRCUIT_PRESETS.find((p) => p.id === id)
  let next = params.value
  if (preset) {
    next = withYear(next, 'circuit', y, preset.name)
    next = withYear(next, 'prizePerWin', y, preset.prizePerWin)
    next = withYear(next, 'prizePerTop10', y, preset.prizePerTop10)
    next = withYear(next, 'prizePerCut', y, preset.prizePerCut)
  } else {
    next = withYear(next, 'circuit', y, t('products.driver.competition.otherCircuit'))
  }
  emit('update:modelValue', next)
}

function setCount(field: CountField, y: number, v: number | null) {
  emit('update:modelValue', withYear(params.value, field, y, Math.max(0, Math.round(v ?? 0))))
}

function setMoney(field: MoneyField, y: number, v: number | null) {
  emit('update:modelValue', withYear(params.value, field, y, String(v ?? 0)))
}

const gains = computed(() => YEARS.map((y) => competitionGains(params.value, y)))
const costs = computed(() => YEARS.map((y) => competitionCosts(params.value, y)))
const issues = computed(() =>
  YEARS.flatMap((y) => competitionIssues(params.value, y).map((i) => ({ year: y + 1, ...i }))),
)

const money = (v: number) => formatCurrency(v, 0)
</script>

<template>
  <div class="driver-form space-y-4">
    <p class="text-sm text-gray-500">{{ t('products.driver.competition.intro') }}</p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">{{ t('products.driver.parameter') }}</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel
                :label="t('products.driver.competition.field.circuit')"
                :tooltip="t('products.driver.competition.tip.circuit')"
              />
            </td>
            <td v-for="y in YEARS" :key="y">
              <Select
                :model-value="circuitValue(y)"
                :options="circuitGroups"
                option-label="label"
                option-value="value"
                option-group-label="label"
                option-group-children="items"
                class="cell-input"
                :aria-label="`${t('products.driver.competition.field.circuit')} ${YEAR_LABELS[y]}`"
                @update:model-value="(v: string) => selectCircuit(y, v)"
              />
            </td>
          </tr>

          <tr class="section-row"><td :colspan="6">{{ t('products.driver.competition.section.results') }}</td></tr>
          <tr v-for="row in countRows" :key="row.field">
            <td class="label-col">
              <KFieldLabel
                :label="t(`products.driver.competition.field.${row.key}`)"
                :tooltip="t(`products.driver.competition.tip.${row.key}`)"
              />
            </td>
            <td v-for="y in YEARS" :key="y">
              <InputNumber
                :model-value="params[row.field][y]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                :input-id="`competition-${row.field}-${y}`"
                @update:model-value="(v) => setCount(row.field, y, v)"
              />
            </td>
          </tr>

          <template v-for="section in moneySections" :key="section.key">
            <tr class="section-row">
              <td :colspan="6">{{ t(`products.driver.competition.section.${section.key}`) }}</td>
            </tr>
            <tr v-for="row in section.rows" :key="row.field">
              <td class="label-col">
                <KFieldLabel
                  :label="t(`products.driver.competition.field.${row.key}`)"
                  :tooltip="t(`products.driver.competition.tip.${row.key}`)"
                />
              </td>
              <td v-for="y in YEARS" :key="y">
                <InputNumber
                  :model-value="Number(params[row.field][y] || 0)"
                  :min="0" :max="row.share ? 1 : undefined"
                  :max-fraction-digits="row.share ? 4 : 2"
                  class="cell-input"
                  :input-id="`competition-${row.field}-${y}`"
                  @update:model-value="(v) => setMoney(row.field, y, v)"
                />
              </td>
            </tr>
          </template>

          <tr class="section-row"><td :colspan="6">{{ t('products.driver.competition.section.result') }}</td></tr>
          <tr class="computed-row" data-test="competition-gains">
            <td class="label-col">{{ t('products.driver.competition.field.gains') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ money(gains[y]!) }}</td>
          </tr>
          <tr class="computed-row" data-test="competition-costs">
            <td class="label-col">{{ t('products.driver.competition.field.costs') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ money(costs[y]!) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-if="issues.length" class="issues" role="alert" data-test="competition-issues">
      <li v-for="(issue, i) in issues" :key="i">
        {{ YEAR_LABELS[issue.year - 1] }} — {{ t(issue.key, issue.params) }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.driver-form { padding: 0.5rem 0; }
.driver-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.driver-table th,
.driver-table td { padding: 0.35rem 0.5rem; text-align: center; vertical-align: middle; border: 1px solid #e5e7eb; }
.driver-table th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 0.8rem; }
.label-col { text-align: left !important; min-width: 220px; background: #f9fafb; }
.section-row td {
  text-align: left; font-weight: 600; font-size: 0.75rem; letter-spacing: 0.04em;
  text-transform: uppercase; color: #4b5563; background: #f3f4f6;
}
.computed-row td { font-weight: 600; background: #f9fafb; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.cell-input { width: 100%; }
:deep(.cell-input.p-inputnumber),
:deep(.cell-input.p-inputnumber input) { width: 100%; min-width: 80px; }
:deep(.cell-input.p-select) { min-width: 140px; }
.issues {
  margin: 0; padding: 0.5rem 0.75rem 0.5rem 1.5rem; font-size: 0.8rem; color: #b91c1c;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.375rem; list-style: disc;
}
</style>
