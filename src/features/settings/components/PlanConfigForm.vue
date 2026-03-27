<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useUiStore } from '@/stores/ui'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Fieldset from 'primevue/fieldset'
import KFieldLabel from '@/components/common/KFieldLabel.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import { debounce } from '@/utils/format'

const settingsStore = useSettingsStore()
const ui = useUiStore()

// ── % fields stored as fractions in the DB (e.g. 0.42 = 42 %) ──────────────
// We scale ×100 for display and ÷100 before saving.
const PCT_FIELDS = [
  'employerTaxRate', 'corporateTaxRate', 'vatRate',
  'avgDistributorDiscount', 'mltInterestRate', 'discountedSalesPct',
  'billsDiscountRate', 'taxesAndDutiesRate', 'interestOnPositiveCash',
  'discountRate', 'incentiveCap',
]

function parseDate(val: any): Date {
  if (!val || val.startsWith('0001')) return new Date()
  const dateStr = typeof val === 'string' ? val.split('T')[0] : val
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime()) ? new Date() : d
}

// Convert API values → form values (fractions → percentages, date → Date)
function toFormValues(config: Record<string, any>): Record<string, any> {
  const r = { ...config }
  for (const f of PCT_FIELDS) {
    if (r[f] != null) r[f] = Math.round(Number(r[f]) * 100 * 100) / 100 // ×100, keep 2dp
  }
  r.forecastStart = parseDate(r.forecastStart)
  return r
}

// Convert form values → API payload (percentages → fractions, Date → ISO)
function toApiValues(formVals: Record<string, any>): Record<string, any> {
  const r = { ...formVals }
  for (const f of PCT_FIELDS) {
    if (r[f] != null) r[f] = Number(r[f]) / 100
  }
  if (r.forecastStart instanceof Date) {
    r.forecastStart = r.forecastStart.toISOString()
  }
  return r
}

const form = ref<Record<string, any>>(toFormValues({ ...settingsStore.config! }))

// ── Country presets ──────────────────────────────────────────────────────────
type CountryPreset = {
  label: string
  currency: string
  employerTaxRate: number
  corporateTaxRate: number
  vatRate: number
}

const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  BE: { label: 'Belgium',        currency: '€',   employerTaxRate: 42,   corporateTaxRate: 25,   vatRate: 21   },
  FR: { label: 'France',         currency: '€',   employerTaxRate: 45,   corporateTaxRate: 25,   vatRate: 20   },
  DE: { label: 'Germany',        currency: '€',   employerTaxRate: 20,   corporateTaxRate: 30,   vatRate: 19   },
  LU: { label: 'Luxembourg',     currency: '€',   employerTaxRate: 15,   corporateTaxRate: 17,   vatRate: 17   },
  NL: { label: 'Netherlands',    currency: '€',   employerTaxRate: 18,   corporateTaxRate: 26,   vatRate: 21   },
  ES: { label: 'Spain',          currency: '€',   employerTaxRate: 30,   corporateTaxRate: 25,   vatRate: 21   },
  IT: { label: 'Italy',          currency: '€',   employerTaxRate: 33,   corporateTaxRate: 24,   vatRate: 22   },
  GB: { label: 'United Kingdom', currency: '£',   employerTaxRate: 13.8, corporateTaxRate: 25,   vatRate: 20   },
  CH: { label: 'Switzerland',    currency: 'CHF', employerTaxRate: 13,   corporateTaxRate: 15,   vatRate: 8.1  },
  US: { label: 'United States',  currency: '$',   employerTaxRate: 7.65, corporateTaxRate: 21,   vatRate: 0    },
}

const countryOptions = Object.entries(COUNTRY_PRESETS).map(([code, p]) => ({
  value: code,
  label: `${p.label} (${code})`,
}))

function onCountryChange(code: string) {
  const preset = COUNTRY_PRESETS[code]
  if (preset) {
    form.value.employerTaxRate  = preset.employerTaxRate
    form.value.corporateTaxRate = preset.corporateTaxRate
    form.value.vatRate          = preset.vatRate
    form.value.currencySymbol   = preset.currency
  }
  debouncedSave()
}

const languageOptions = [
  { label: 'Français', value: 'fr' },
  { label: 'English',  value: 'en' },
]

const currencyOptions = [
  { label: '€ (Euro)',          value: '€'   },
  { label: '$ (Dollar)',        value: '$'   },
  { label: '£ (Pound)',         value: '£'   },
  { label: 'CHF (Swiss Franc)', value: 'CHF' },
]

const overdraftRate = computed(() => {
  const mlt = parseFloat(form.value.mltInterestRate) || 0
  return mlt + 3
})

const saving = ref(false)

const debouncedSave = debounce(async () => {
  saving.value = true
  try {
    await settingsStore.updateConfig(toApiValues(form.value))
    ui.showToast('success', 'Settings saved')
  } catch (err: any) {
    ui.showToast('error', 'Failed to save', err.message)
  } finally {
    saving.value = false
  }
}, 500)

function onFieldChange() {
  debouncedSave()
}
</script>

<template>
  <div class="space-y-6 max-w-4xl pt-4">

    <KFormLegend
      :extras="[{ icon: 'pi-calendar', text: 'Forecast Start sets the first month of Year 1' }]"
    />

    <!-- ── General ─────────────────────────────────────────────────────────── -->
    <Fieldset legend="General">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <KFieldLabel
            label="Language"
            tooltip="Output language used in generated reports and PDF exports."
          />
          <Select
            v-model="form.language"
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            @change="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Company Name"
            tooltip="Legal name of your company. Appears in report headers and PDF cover pages."
          />
          <InputText v-model="form.companyName" class="w-full" @blur="onFieldChange" />
        </div>
        <div>
          <KFieldLabel
            label="Forecast Start Date"
            tooltip="First day of your 5-year forecast horizon. Year 1 begins on this date. A partial first fiscal year (< 12 months) is supported via 'First Fiscal Year Months'."
          />
          <DatePicker
            v-model="form.forecastStart"
            dateFormat="yy-mm-dd"
            class="w-full"
            @date-select="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Country"
            tooltip="Selecting a country auto-fills VAT rate, corporate tax rate, and employer tax rate with local regulatory defaults. You can still override these values manually."
          />
          <Select
            v-model="form.country"
            :options="countryOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Select country…"
            @change="onCountryChange(form.country)"
          />
        </div>
        <div>
          <KFieldLabel
            label="Currency Symbol"
            tooltip="Currency symbol displayed next to all monetary values in the UI and reports (e.g. €, $, £, CHF)."
          />
          <Select
            v-model="form.currencySymbol"
            :options="currencyOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            @change="onFieldChange"
          />
        </div>
      </div>
    </Fieldset>

    <!-- ── Staff & Fiscal ──────────────────────────────────────────────────── -->
    <Fieldset legend="Staff & Fiscal">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <KFieldLabel
            label="Previous Staff"
            tooltip="Number of employees already on payroll before the forecast period starts. Used as the baseline headcount for Year 1 staffing calculations."
          />
          <InputNumber
            v-model="form.previousStaff"
            :min="0"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Salary Months / Year"
            tooltip="Enter 12 for standard monthly pay. Enter 13 if your company pays a 13th-month bonus (double December or equivalent)."
          />
          <InputNumber
            v-model="form.salaryMonthsPerYear"
            :min="12"
            :max="13"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Employer Tax Rate (%)"
            tooltip="Total employer social contributions paid on top of gross salaries. Includes pension, health insurance, and other mandatory contributions. Typical values: Belgium 42 %, France 45 %, Germany 20 %."
          />
          <InputNumber
            v-model="form.employerTaxRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="First Fiscal Year Months"
            tooltip="Number of accounting months in Year 1. Use a value less than 12 if your company has a short first fiscal year (e.g. incorporated in September → 4 months to December)."
          />
          <InputNumber
            v-model="form.firstFiscalYearMonths"
            :min="1"
            :max="12"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Incentive Cap (%)"
            tooltip="Maximum variable bonus any individual employee can receive, expressed as a percentage of their gross annual salary. Prevents bonus calculations from exceeding this ceiling."
          />
          <InputNumber
            v-model="form.incentiveCap"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
      </div>
    </Fieldset>

    <!-- ── Key Rates ───────────────────────────────────────────────────────── -->
    <Fieldset legend="Key Rates">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <KFieldLabel
            label="VAT Rate (%)"
            tooltip="Standard VAT (Value Added Tax) rate applied to domestic sales. Used to compute VAT collected and VAT paid in the cash flow model. Export sales are typically zero-rated."
          />
          <InputNumber
            v-model="form.vatRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Corporate Tax Rate (%)"
            tooltip="Annual income tax rate applied to pre-tax profits. Losses are carried forward and deducted from future taxable income automatically."
          />
          <InputNumber
            v-model="form.corporateTaxRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Taxes & Duties Rate (%)"
            tooltip="Other taxes levied on turnover (municipal business tax, regional duties, etc.) that are separate from corporate income tax and VAT."
          />
          <InputNumber
            v-model="form.taxesAndDutiesRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Prior Year Turnover (€)"
            tooltip="Total revenue in the year immediately before the forecast starts, in base €. Used to compute Year 1 growth rates and baseline comparisons in reports."
          />
          <InputNumber
            v-model="form.priorYearTurnover"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Avg Distributor Discount (%)"
            tooltip="Average price reduction granted to channel partners (distributors, resellers). Applied to the portion of sales going through the discount channel."
          />
          <InputNumber
            v-model="form.avgDistributorDiscount"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Discounted Sales (%)"
            tooltip="Percentage of total sales that go through distributors or channels receiving the discount. The remainder is assumed to be direct sales at full price."
          />
          <InputNumber
            v-model="form.discountedSalesPct"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Avg Bill Term (months)"
            tooltip="Average number of months before a trade receivable bill falls due for payment. Used when calculating bill discounting capacity."
          />
          <InputNumber
            v-model="form.avgBillTermMonths"
            :min="0"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Bills Discount Rate (%)"
            tooltip="Annual interest rate charged by the bank when you discount receivables bills before their maturity date (i.e. you get cash earlier, at a cost)."
          />
          <InputNumber
            v-model="form.billsDiscountRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="Interest on Positive Cash (%)"
            tooltip="Annual interest rate earned on cash balances held in current or savings accounts. Applied to the end-of-year positive cash position in the cash flow model."
          />
          <InputNumber
            v-model="form.interestOnPositiveCash"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="MLT Interest Rate (%)"
            tooltip="Annual interest rate on medium-to-long-term (MLT) bank loans. The overdraft rate is automatically set to this rate + 3 % (shown in Computed Values below)."
          />
          <InputNumber
            v-model="form.mltInterestRate"
            suffix=" %"
            :maxFractionDigits="2"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
        <div>
          <KFieldLabel
            label="MLT Loan Term (years)"
            tooltip="Repayment duration in years for medium-to-long-term bank loans. Determines the annual principal repayment schedule in the financing plan."
          />
          <InputNumber
            v-model="form.mltLoanTermYears"
            :min="1"
            class="w-full"
            @blur="onFieldChange"
          />
        </div>
      </div>
    </Fieldset>

    <!-- ── Computed Values ─────────────────────────────────────────────────── -->
    <Fieldset legend="Computed Values" :toggleable="true">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <KFieldLabel
            label="Overdraft Rate"
            tooltip="Automatically computed as MLT Interest Rate + 3 %. Applied to negative cash positions (bank overdraft) in the cash flow model."
          />
          <div class="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
            {{ overdraftRate.toFixed(2) }} %
          </div>
        </div>
        <div v-if="settingsStore.configComputed?.yearHeaders">
          <KFieldLabel
            label="Year Headers"
            tooltip="Fiscal year labels derived from your Forecast Start Date. Used as column headers in all multi-year tables."
          />
          <div class="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
            {{ settingsStore.configComputed.yearHeaders.join(', ') }}
          </div>
        </div>
        <div v-if="settingsStore.configComputed?.unitLabel">
          <KFieldLabel
            label="Unit Label"
            tooltip="Display unit appended to monetary columns (e.g. 'k€' for thousands of euros). Derived from your currency symbol."
          />
          <div class="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
            {{ settingsStore.configComputed.unitLabel }}
          </div>
        </div>
      </div>
    </Fieldset>

    <div class="flex items-center gap-2 text-sm text-gray-500">
      <i v-if="saving" class="pi pi-spin pi-spinner"></i>
      <span v-if="saving">Saving…</span>
      <span v-else><i class="pi pi-check text-green-500"></i> Auto-saved</span>
    </div>
  </div>
</template>
