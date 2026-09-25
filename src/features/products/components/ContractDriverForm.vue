<script setup lang="ts">
/**
 * ContractDriverForm.vue — parameters of the 'contract' driver
 * (sponsorship or image rights): one row per contract with its value per
 * year and its bonus per win. The bonus is paid on the wins entered on the
 * scenario's competition products, for contracts active that year; the
 * footer shows the resulting revenue per year.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useDecimal } from '@/composables/useDecimal'
import { useProductStore } from '@/features/products/stores/productStore'
import type { ContractLine, ContractParams } from '@/types'
import {
  YEARS,
  contractBonus,
  contractFixed,
  emptyContract,
  scenarioWins,
} from '../utils/athleteDrivers'

const props = defineProps<{ modelValue: ContractParams }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: ContractParams): void }>()
const { t } = useI18n()
const { formatCurrency } = useDecimal()
const productStore = useProductStore()

const YEAR_LABELS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5']

const contracts = computed(() => props.modelValue.contracts ?? [])

function update(contracts: ContractLine[]) {
  emit('update:modelValue', { ...props.modelValue, contracts })
}

function patchContract(index: number, patch: Partial<ContractLine>) {
  update(contracts.value.map((c, i) => (i === index ? { ...c, ...patch } : c)))
}

function setAmount(index: number, y: number, v: number | null) {
  const amounts = [...contracts.value[index]!.amounts] as ContractLine['amounts']
  amounts[y] = String(v ?? 0)
  patchContract(index, { amounts })
}

function addContract() {
  update([...contracts.value, emptyContract()])
}

function removeContract(index: number) {
  update(contracts.value.filter((_, i) => i !== index))
}

const wins = computed(() => scenarioWins(productStore.products))
const fixed = computed(() => YEARS.map((y) => contractFixed(props.modelValue, y)))
const bonus = computed(() => YEARS.map((y) => contractBonus(props.modelValue, y, wins.value[y]!)))
const total = computed(() => YEARS.map((y) => fixed.value[y]! + bonus.value[y]!))

const money = (v: number) => formatCurrency(v, 0)
</script>

<template>
  <div class="driver-form space-y-4">
    <p class="text-sm text-gray-500">{{ t('products.driver.contract.intro') }}</p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">{{ t('products.driver.contract.field.partner') }}</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
            <th>{{ t('products.driver.contract.field.bonusPerWin') }}</th>
            <th class="action-col"><span class="sr-only">{{ t('products.driver.contract.remove') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(contract, index) in contracts" :key="index" data-test="contract-row">
            <td class="label-col">
              <InputText
                :model-value="contract.partner"
                :placeholder="t('products.driver.contract.partnerPlaceholder')"
                :aria-label="t('products.driver.contract.field.partner')"
                :id="`contract-partner-${index}`"
                class="w-full"
                @update:model-value="(v) => patchContract(index, { partner: v ?? '' })"
              />
            </td>
            <td v-for="y in YEARS" :key="y">
              <InputNumber
                :model-value="Number(contract.amounts[y] || 0)"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                :input-id="`contract-${index}-amount-${y}`"
                :aria-label="`${contract.partner || t('products.driver.contract.field.partner')} ${YEAR_LABELS[y]}`"
                @update:model-value="(v) => setAmount(index, y, v)"
              />
            </td>
            <td>
              <InputNumber
                :model-value="Number(contract.bonusPerWin || 0)"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                :input-id="`contract-${index}-bonus`"
                :aria-label="t('products.driver.contract.field.bonusPerWin')"
                @update:model-value="(v) => patchContract(index, { bonusPerWin: String(v ?? 0) })"
              />
            </td>
            <td class="action-col">
              <Button
                icon="pi pi-trash"
                severity="secondary"
                text
                size="small"
                :aria-label="t('products.driver.contract.remove')"
                data-test="contract-remove"
                @click="removeContract(index)"
              />
            </td>
          </tr>
          <tr v-if="!contracts.length">
            <td :colspan="8" class="empty">{{ t('products.driver.contract.empty') }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="computed-row">
            <td class="label-col">{{ t('products.driver.contract.field.fixed') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ money(fixed[y]!) }}</td>
            <td colspan="2"></td>
          </tr>
          <tr class="computed-row" data-test="contract-wins">
            <td class="label-col">{{ t('products.driver.contract.field.wins') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ wins[y] }}</td>
            <td colspan="2"></td>
          </tr>
          <tr class="computed-row">
            <td class="label-col">{{ t('products.driver.contract.field.bonus') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ money(bonus[y]!) }}</td>
            <td colspan="2"></td>
          </tr>
          <tr class="computed-row total-row" data-test="contract-total">
            <td class="label-col">{{ t('products.driver.contract.field.total') }}</td>
            <td v-for="y in YEARS" :key="y" class="num">{{ money(total[y]!) }}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <Button
      icon="pi pi-plus"
      :label="t('products.driver.contract.add')"
      severity="secondary"
      outlined
      size="small"
      data-test="contract-add"
      @click="addContract"
    />
  </div>
</template>

<style scoped>
.driver-form { padding: 0.5rem 0; }
.driver-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.driver-table th,
.driver-table td { padding: 0.35rem 0.5rem; text-align: center; vertical-align: middle; border: 1px solid #e5e7eb; }
.driver-table th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 0.8rem; }
.label-col { text-align: left !important; min-width: 220px; background: #f9fafb; }
.action-col { width: 3rem; }
.computed-row td { font-weight: 600; background: #f9fafb; }
.total-row td { border-top: 2px solid #9ca3af; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.empty { color: #6b7280; font-style: italic; }
.cell-input { width: 100%; }
:deep(.cell-input.p-inputnumber),
:deep(.cell-input.p-inputnumber input) { width: 100%; min-width: 80px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
