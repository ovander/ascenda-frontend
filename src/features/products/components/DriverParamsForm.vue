<script setup lang="ts">
/**
 * DriverParamsForm.vue
 *
 * Renders the driver-specific parameter form for a product.
 * Emits `update:modelValue` whenever any field changes so the parent can
 * debounce-save via productStore.updateDriverParams.
 */
import { computed, watch } from 'vue'
import type {
  DriverType,
  DriverParams,
  ConsultingParams,
  SaaSParams,
  IndustryParams,
  MarketplaceParams,
  MediaParams,
  SessionBasedParams,
} from '@/types'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import KFieldLabel from '@/components/common/KFieldLabel.vue'

// ── Props / Emits ──────────────────────────────────────────────────────────
interface Props {
  driverType: DriverType
  modelValue: DriverParams
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: DriverParams): void
}>()

// ── Typed accessors ────────────────────────────────────────────────────────
const consulting   = computed(() => props.modelValue as ConsultingParams   | null)
const saas         = computed(() => props.modelValue as SaaSParams         | null)
const industry     = computed(() => props.modelValue as IndustryParams     | null)
const marketplace  = computed(() => props.modelValue as MarketplaceParams  | null)
const media        = computed(() => props.modelValue as MediaParams        | null)
const sessionBased = computed(() => props.modelValue as SessionBasedParams | null)

// ── Helpers ────────────────────────────────────────────────────────────────
const YEAR_LABELS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5']

/** Returns a number for InputNumber given a string field value. */
function toNum(v: string | number | undefined): number {
  if (v == null || v === '') return 0
  return Number(v)
}

/**
 * Emit a shallow-merged update for a single field.
 * For array fields we pass an index + value; for scalar fields just key + value.
 */
function patchArr(
  field: string,
  idx: number,
  value: number | string
) {
  if (!props.modelValue) return
  const arr = [...((props.modelValue as any)[field] as any[])]
  // Preserve the element type of the original array so integer fields (int64 in
  // Go) stay as JSON numbers rather than being coerced to strings, which would
  // cause json.Unmarshal to fail with "cannot unmarshal string into int64".
  const sample = arr.find((v) => v != null && v !== '')
  arr[idx] = typeof sample === 'number' ? Number(value) : String(value)
  emit('update:modelValue', { ...props.modelValue, [field]: arr } as DriverParams)
}

function patchScalar(field: string, value: number | string) {
  if (!props.modelValue) return
  emit('update:modelValue', { ...props.modelValue, [field]: value } as DriverParams)
}

// ── Default empty params per driver ───────────────────────────────────────
function defaultConsulting(): ConsultingParams {
  return {
    headcount:       ['1', '1', '1', '1', '1'],
    workingDays:     220,
    utilizationRate: ['0.75', '0.75', '0.75', '0.75', '0.75'],
    monthlyGross:    ['3000', '3000', '3000', '3000', '3000'],
    employerCharges: '0.45',
  }
}
function defaultSaaS(): SaaSParams {
  return {
    activeUsers:       [10, 10, 10, 10, 10],
    monthlyFee:        ['100', '100', '100', '100', '100'],
    infraCostPerUser:  ['10', '10', '10', '10', '10'],
    supportCostPerUser:['5', '5', '5', '5', '5'],
  }
}
function defaultIndustry(): IndustryParams {
  return {
    productionCapacity: [1000, 1000, 1000, 1000, 1000],
    scrapRate:          ['0.02', '0.02', '0.02', '0.02', '0.02'],
    setupCost:          ['0', '0', '0', '0', '0'],
  }
}
function defaultMarketplace(): MarketplaceParams {
  return {
    transactions:      [100, 100, 100, 100, 100],
    gmvPerTransaction: ['100', '100', '100', '100', '100'],
    takeRate:          ['0.10', '0.10', '0.10', '0.10', '0.10'],
    paymentCost:       ['2', '2', '2', '2', '2'],
    fixedInfraCost:    ['0', '0', '0', '0', '0'],
  }
}
function defaultMedia(): MediaParams {
  return {
    impressions:                [1000000, 1000000, 1000000, 1000000, 1000000],
    cpm:                        ['5', '5', '5', '5', '5'],
    fillRate:                   ['0.70', '0.70', '0.70', '0.70', '0.70'],
    contentCost:                ['0', '0', '0', '0', '0'],
    deliveryCostPerImpression:  ['0.001', '0.001', '0.001', '0.001', '0.001'],
  }
}
function defaultSessionBased(): SessionBasedParams {
  return {
    sessions:                   [50, 50, 50, 50, 50],
    participantsPerSession:     ['20', '20', '20', '20', '20'],
    fillRate:                   ['0.75', '0.75', '0.75', '0.75', '0.75'],
    pricePerParticipant:        ['100', '100', '100', '100', '100'],
    trainerCount:               ['2', '2', '2', '2', '2'],
    sessionsPerTrainer:         [30, 30, 30, 30, 30],
    utilizationRate:            ['0.85', '0.85', '0.85', '0.85', '0.85'],
    trainerCostPerSession:      ['300', '300', '300', '300', '300'],
    variableCostPerParticipant: ['10', '10', '10', '10', '10'],
  }
}

// Seed default params when the driver type changes and no params are set yet.
watch(
  () => props.driverType,
  (dt) => {
    if (dt === 'generic' || props.modelValue != null) return
    const defaults: Record<string, DriverParams> = {
      consulting:   defaultConsulting(),
      saas:         defaultSaaS(),
      industry:     defaultIndustry(),
      marketplace:  defaultMarketplace(),
      media:        defaultMedia(),
      session_based: defaultSessionBased(),
    }
    if (defaults[dt]) emit('update:modelValue', defaults[dt])
  },
  { immediate: true }
)
</script>

<template>
  <!-- ── Consulting ──────────────────────────────────────────────────────── -->
  <div v-if="driverType === 'consulting' && consulting" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume = <strong>Headcount × Working Days × Utilisation Rate</strong> (per year).
      The billing rate is set on the <em>Key Assumptions</em> tab (Day Rate).
    </p>

    <!-- Scalar fields -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <KFieldLabel
          label="Working Days / Year"
          tooltip="Total number of working days per consultant per year (before applying utilisation rate). Typically 218–225."
        />
        <InputNumber
          :model-value="consulting.workingDays"
          :min="1" :max="365" :max-fraction-digits="0"
          class="w-full"
          @update:model-value="(v) => patchScalar('workingDays', v ?? 220)"
        />
      </div>
      <div>
        <KFieldLabel
          label="Employer Charge Rate"
          tooltip="Employer social-security / payroll-tax ratio applied on top of gross salary. E.g. 0.45 = 45 % charges patronales."
        />
        <InputNumber
          :model-value="toNum(consulting.employerCharges)"
          :min="0" :max="5" :max-fraction-digits="4"
          class="w-full"
          @update:model-value="(v) => patchScalar('employerCharges', String(v ?? 0))"
        />
      </div>
    </div>

    <!-- 5-year arrays -->
    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Headcount (FTE)" tooltip="Number of full-time-equivalent consultants billing client hours in this year." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(consulting.headcount[i])"
                :min="0" :max-fraction-digits="1"
                class="cell-input"
                @update:model-value="(v) => patchArr('headcount', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Utilisation Rate" tooltip="Fraction of working days that are billable to clients. 0.75 = 75 % utilisation." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(consulting.utilizationRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('utilizationRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Monthly Gross Salary (€)" tooltip="Average gross monthly salary per consultant, used to compute cost-per-billable-day." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(consulting.monthlyGross[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('monthlyGross', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── SaaS ───────────────────────────────────────────────────────────── -->
  <div v-else-if="driverType === 'saas' && saas" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume = <strong>Active Users</strong> (per year).
      Revenue/unit = <strong>Monthly Fee × 12</strong>.
      Cost/unit = <strong>(Infra + Support) × 12</strong>.
    </p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Active Users" tooltip="Average number of paying active users for the year." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="saas.activeUsers[i]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('activeUsers', i, v ?? 0)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Monthly Fee (€)" tooltip="Average revenue per active user per month." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(saas.monthlyFee[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('monthlyFee', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Infra Cost / User / Month (€)" tooltip="Cloud infrastructure cost attributable to one user per month." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(saas.infraCostPerUser[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('infraCostPerUser', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Support Cost / User / Month (€)" tooltip="Customer-support cost per active user per month." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(saas.supportCostPerUser[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('supportCostPerUser', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Industry ───────────────────────────────────────────────────────── -->
  <div v-else-if="driverType === 'industry' && industry" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume is taken from the <em>Sales Volumes</em> tab.
      The driver adjusts unit cost for <strong>scrap</strong> and amortises <strong>setup cost</strong> over production.
    </p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Production Capacity (units)" tooltip="Maximum units the production line can manufacture per year at full capacity." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="industry.productionCapacity[i]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('productionCapacity', i, v ?? 0)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Scrap Rate" tooltip="Fraction of production lost to defects / waste. 0.02 = 2 % scrap. Increases effective cost per good unit." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(industry.scrapRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('scrapRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Setup Cost (€/year)" tooltip="Annual fixed tooling, mould or changeover cost amortised across all units produced." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(industry.setupCost[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('setupCost', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Marketplace ────────────────────────────────────────────────────── -->
  <div v-else-if="driverType === 'marketplace' && marketplace" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume = <strong>Transactions</strong>.
      Net revenue/txn = <strong>GMV × Take Rate</strong>.
      Cost/txn = <strong>Payment Cost + Fixed Infra / Transactions</strong>.
    </p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Transactions" tooltip="Number of completed transactions on the marketplace per year." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="marketplace.transactions[i]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('transactions', i, v ?? 0)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="GMV / Transaction (€)" tooltip="Gross Merchandise Value of an average transaction on the marketplace." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(marketplace.gmvPerTransaction[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('gmvPerTransaction', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Take Rate" tooltip="Platform commission as a fraction of GMV. 0.10 = 10 % take rate." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(marketplace.takeRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('takeRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Payment Cost / Transaction (€)" tooltip="Per-transaction processing fee paid to the payment gateway." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(marketplace.paymentCost[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('paymentCost', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Fixed Infra Cost (€/year)" tooltip="Annual fixed infrastructure cost amortised across all transactions in the year." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(marketplace.fixedInfraCost[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('fixedInfraCost', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Media ──────────────────────────────────────────────────────────── -->
  <div v-else-if="driverType === 'media' && media" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume = <strong>Impressions / 1 000</strong> (per-mille blocks).
      Revenue/mille = <strong>CPM × Fill Rate</strong>.
      Cost/mille = <strong>Delivery Cost × 1 000 + Content Cost / blocks</strong>.
    </p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Impressions / Year" tooltip="Total ad impressions served per year before fill rate is applied." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="media.impressions[i]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('impressions', i, v ?? 0)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="CPM (€)" tooltip="Cost per thousand impressions charged to advertisers." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(media.cpm[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('cpm', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Fill Rate" tooltip="Fraction of impressions that are filled with a paid ad. 0.70 = 70 % fill rate." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(media.fillRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('fillRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Content Cost (€/year)" tooltip="Annual content-production or licensing cost, amortised across all per-mille blocks." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(media.contentCost[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('contentCost', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel label="Delivery Cost / Impression (€)" tooltip="Variable cost to technically serve one impression (CDN, bandwidth, ad-server)." />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(media.deliveryCostPerImpression[i])"
                :min="0" :max-fraction-digits="6"
                class="cell-input"
                @update:model-value="(v) => patchArr('deliveryCostPerImpression', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Session-Based ─────────────────────────────────────────────────── -->
  <div v-else-if="driverType === 'session_based' && sessionBased" class="driver-form space-y-6">
    <p class="text-sm text-gray-500">
      Volume = <strong>Actual Sessions</strong> (capacity-clamped).
      Revenue/session = <strong>Participants × Fill Rate × Price / Participant</strong>.
      Cost/session = <strong>Trainer Cost + Variable Cost × Realized Participants</strong>.
    </p>

    <div class="overflow-x-auto">
      <table class="driver-table">
        <thead>
          <tr>
            <th class="label-col">Parameter</th>
            <th v-for="y in YEAR_LABELS" :key="y">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- ── Demand ── -->
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Planned Sessions"
                tooltip="Number of sessions planned per year before trainer capacity is applied. Actual sessions may be lower if trainers are overbooked."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="sessionBased.sessions[i]"
                :min="0" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('sessions', i, v ?? 0)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Participants / Session (max)"
                tooltip="Maximum design capacity of a session — the room or platform limit before fill rate is applied."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.participantsPerSession[i])"
                :min="1" :max-fraction-digits="1"
                class="cell-input"
                @update:model-value="(v) => patchArr('participantsPerSession', i, String(v ?? 1))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Fill Rate"
                tooltip="Fraction of session capacity actually filled. 0.75 = 75 % of seats taken on average. Drives revenue and variable cost."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.fillRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('fillRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <!-- ── Pricing ── -->
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Price / Participant (€)"
                tooltip="Revenue charged per attending participant. UnitPrice = Participants × FillRate × Price/Participant."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.pricePerParticipant[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('pricePerParticipant', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <!-- ── Trainer Capacity ── -->
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Trainer Count"
                tooltip="Number of trainers or facilitators available to deliver sessions this year."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.trainerCount[i])"
                :min="0" :max-fraction-digits="1"
                class="cell-input"
                @update:model-value="(v) => patchArr('trainerCount', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Sessions / Trainer / Year"
                tooltip="Maximum number of sessions one trainer can deliver in a year. Trainer capacity = TrainerCount × this value × UtilizationRate."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="sessionBased.sessionsPerTrainer[i]"
                :min="1" :max-fraction-digits="0"
                class="cell-input"
                @update:model-value="(v) => patchArr('sessionsPerTrainer', i, v ?? 1)"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Trainer Utilisation Rate"
                tooltip="Fraction of trainer capacity actually scheduled. 0.85 = trainers are booked 85 % of their maximum capacity."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.utilizationRate[i])"
                :min="0" :max="1" :max-fraction-digits="4"
                class="cell-input"
                @update:model-value="(v) => patchArr('utilizationRate', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <!-- ── Costs ── -->
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Trainer Cost / Session (€)"
                tooltip="Fixed cost per session: trainer fee, venue rental, equipment. Does not scale with participant count."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.trainerCostPerSession[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('trainerCostPerSession', i, String(v ?? 0))"
              />
            </td>
          </tr>
          <tr>
            <td class="label-col">
              <KFieldLabel
                label="Variable Cost / Participant (€)"
                tooltip="Cost that scales with each attending participant: handouts, catering, licenses, certificates, etc."
              />
            </td>
            <td v-for="(_, i) in YEAR_LABELS" :key="i">
              <InputNumber
                :model-value="toNum(sessionBased.variableCostPerParticipant[i])"
                :min="0" :max-fraction-digits="2"
                class="cell-input"
                @update:model-value="(v) => patchArr('variableCostPerParticipant', i, String(v ?? 0))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Fallback (should not happen for non-generic types) -->
  <div v-else-if="driverType !== 'generic'" class="text-sm text-gray-400 italic py-4">
    No parameter form available for driver type "{{ driverType }}".
  </div>
</template>

<style scoped>
.driver-form {
  padding: 0.5rem 0;
}

.driver-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.driver-table th,
.driver-table td {
  padding: 0.35rem 0.5rem;
  text-align: center;
  vertical-align: middle;
  border: 1px solid #e5e7eb;
}

.driver-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
}

.label-col {
  text-align: left !important;
  min-width: 220px;
  background: #f9fafb;
}

.cell-input {
  width: 100%;
}

/* Make PrimeVue InputNumber fill the cell */
:deep(.cell-input.p-inputnumber),
:deep(.cell-input.p-inputnumber input) {
  width: 100%;
  min-width: 80px;
}
</style>
