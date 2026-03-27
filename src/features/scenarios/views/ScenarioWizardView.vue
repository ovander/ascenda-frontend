<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useProductStore } from '@/features/products/stores/productStore'
import { useTierGate } from '@/composables/useTierGate'
import { useToast } from 'primevue/usetoast'
import Steps from 'primevue/steps'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Toast from 'primevue/toast'
import Card from 'primevue/card'
import UpgradeModal from '@/components/common/UpgradeModal.vue'

// ── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{ planId?: string; sid?: string }>()

// ── Stores & composables ─────────────────────────────────────────────────────
const router = useRouter()
const scenarioStore = useScenarioStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()
const productStore = useProductStore()
const toast = useToast()
const { isPro } = useTierGate()

// ── Step definition ───────────────────────────────────────────────────────────
const FREE_STEPS = [
  { label: 'Details',     icon: 'pi pi-file-edit' },
  { label: 'Planning',    icon: 'pi pi-calendar'  },
  { label: 'Key Rates',   icon: 'pi pi-percentage' },
  { label: 'Revenue',     icon: 'pi pi-chart-line' },
  { label: 'Review',      icon: 'pi pi-check-circle' },
]

const PRO_STEPS = [
  { label: 'Details',     icon: 'pi pi-file-edit'   },
  { label: 'Planning',    icon: 'pi pi-calendar'     },
  { label: 'Key Rates',   icon: 'pi pi-percentage'   },
  { label: 'Balance',     icon: 'pi pi-money-bill'   },
  { label: 'Cash Flow',   icon: 'pi pi-sync'         },
  { label: 'Revenue',     icon: 'pi pi-chart-line'   },
  { label: 'Review',      icon: 'pi pi-check-circle' },
]

const steps = computed(() => isPro.value ? PRO_STEPS : FREE_STEPS)
const reviewStepIndex = computed(() => steps.value.length - 1)
const revenueStepIndex = computed(() => isPro.value ? 5 : 3)

// ── Country presets (mirrors backend country_defaults.go) ────────────────────
type CountryPreset = {
  currencySymbol: string
  language: string
  corporateTaxRate: number // percent, e.g. 25
  vatRate: number
  employerTaxRate: number
  mltInterestRate: number
}

const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  BE: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 25,    vatRate: 21,   employerTaxRate: 27.67, mltInterestRate: 3.0  },
  FR: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 25,    vatRate: 20,   employerTaxRate: 42.0,  mltInterestRate: 3.0  },
  LU: { currencySymbol: '€',   language: 'fr', corporateTaxRate: 17,    vatRate: 17,   employerTaxRate: 12.0,  mltInterestRate: 3.0  },
  NL: { currencySymbol: '€',   language: 'nl', corporateTaxRate: 25.8,  vatRate: 21,   employerTaxRate: 20.0,  mltInterestRate: 3.0  },
  DE: { currencySymbol: '€',   language: 'de', corporateTaxRate: 29.9,  vatRate: 19,   employerTaxRate: 20.0,  mltInterestRate: 3.5  },
  ES: { currencySymbol: '€',   language: 'es', corporateTaxRate: 25,    vatRate: 21,   employerTaxRate: 30.0,  mltInterestRate: 3.5  },
  IT: { currencySymbol: '€',   language: 'it', corporateTaxRate: 27.9,  vatRate: 22,   employerTaxRate: 30.0,  mltInterestRate: 3.5  },
  PT: { currencySymbol: '€',   language: 'pt', corporateTaxRate: 21,    vatRate: 23,   employerTaxRate: 23.75, mltInterestRate: 3.5  },
  IE: { currencySymbol: '€',   language: 'en', corporateTaxRate: 12.5,  vatRate: 23,   employerTaxRate: 11.05, mltInterestRate: 3.0  },
  CH: { currencySymbol: 'CHF', language: 'fr', corporateTaxRate: 18,    vatRate: 8.1,  employerTaxRate: 6.35,  mltInterestRate: 2.0  },
  GB: { currencySymbol: '£',   language: 'en', corporateTaxRate: 25,    vatRate: 20,   employerTaxRate: 13.8,  mltInterestRate: 4.5  },
  US: { currencySymbol: '$',   language: 'en', corporateTaxRate: 21,    vatRate: 0,    employerTaxRate: 7.65,  mltInterestRate: 5.0  },
  CA: { currencySymbol: 'CA$', language: 'fr', corporateTaxRate: 26.5,  vatRate: 5,    employerTaxRate: 7.6,   mltInterestRate: 4.5  },
}

// ── Wizard state ──────────────────────────────────────────────────────────────
const currentStep = ref(0)
const isLoading   = ref(false)

// Step 1 — Scenario Details
const details = reactive({ name: '', description: '' })

// Step 2 — Planning Config
const currentYear = new Date().getFullYear()
const planning = reactive({
  country:              'BE',
  forecastStartYear:    currentYear + 1,
  firstFiscalYearMonths: 12,
  currencySymbol:       '€',
  language:             'fr' as string,
  salaryMonthsPerYear:  12,
})

// Step 3 — Key Rates (percent values for UI; converted to fractions on save)
const rates = reactive({
  corporateTaxRate:  25,
  vatRate:           21,
  employerTaxRate:   27.67,
  discountRate:      10,
  mltInterestRate:   3.0,
})

// Step 4 (Pro) — Opening Balance
const openingBalance = reactive({
  noncurrentAssets:     0,
  inventories:          0,
  customerReceivables:  0,
  cashAndSecurities:    0,
  shareCapital:         0,
  retainedEarnings:     0,
  loansAndDebt:         0,
  supplierPayables:     0,
  socialAndTaxDebts:    0,
})

// Step 5 (Pro) — Working Capital (simplified payment term choice)
const wc = reactive({ customerDays: '30', supplierDays: '30' })

// Step 4/6 — Revenue Lines (products)
type ProductLine = { name: string; productType: string; driverType: string }
const products = ref<ProductLine[]>([{ name: '', productType: 'service', driverType: 'flat' }])

// ── Country preset auto-fill ──────────────────────────────────────────────────
watch(() => planning.country, (code) => {
  const p = COUNTRY_PRESETS[code]
  if (!p) return
  planning.currencySymbol     = p.currencySymbol
  planning.language           = p.language
  rates.corporateTaxRate      = p.corporateTaxRate
  rates.vatRate               = p.vatRate
  rates.employerTaxRate       = p.employerTaxRate
  rates.mltInterestRate       = p.mltInterestRate
})

// ── Drop-down option lists ────────────────────────────────────────────────────
const countryOptions = [
  { label: '🇧🇪 Belgium',     value: 'BE' },
  { label: '🇫🇷 France',      value: 'FR' },
  { label: '🇱🇺 Luxembourg',  value: 'LU' },
  { label: '🇳🇱 Netherlands', value: 'NL' },
  { label: '🇩🇪 Germany',     value: 'DE' },
  { label: '🇬🇧 UK',          value: 'GB' },
  { label: '🇨🇭 Switzerland', value: 'CH' },
  { label: '🇪🇸 Spain',       value: 'ES' },
  { label: '🇮🇹 Italy',       value: 'IT' },
  { label: '🇵🇹 Portugal',    value: 'PT' },
  { label: '🇮🇪 Ireland',     value: 'IE' },
  { label: '🇺🇸 United States', value: 'US' },
  { label: '🇨🇦 Canada',      value: 'CA' },
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Nederlands', value: 'nl' },
  { label: 'Español', value: 'es' },
  { label: 'Italiano', value: 'it' },
  { label: 'Português', value: 'pt' },
]

const fiscalMonthOptions = [
  { label: '12 months', value: 12 },
  { label: '11 months', value: 11 },
  { label: '10 months', value: 10 },
  { label: '9 months',  value: 9  },
  { label: '6 months',  value: 6  },
  { label: '3 months',  value: 3  },
]

const salaryMonthOptions = [
  { label: '12 months', value: 12   },
  { label: '13 months', value: 13   },
  { label: '13.5 months', value: 13.5 },
  { label: '14 months', value: 14   },
]

const paymentTermOptions = [
  { label: 'Immediate (0 days)', value: '0'  },
  { label: '30 days',            value: '30' },
  { label: '60 days',            value: '60' },
  { label: '90 days',            value: '90' },
]

const productTypeOptions = [
  { label: 'Service',      value: 'service'      },
  { label: 'Product',      value: 'product'      },
  { label: 'Subscription', value: 'subscription' },
  { label: 'SaaS',         value: 'saas'         },
]

const driverTypeOptions = [
  { label: 'Flat / Fixed',    value: 'flat'     },
  { label: 'Growth rate',     value: 'growth'   },
  { label: 'Seasonal',        value: 'seasonal' },
  { label: 'Market share',    value: 'market'   },
]

const forecastYearOptions = computed(() => {
  return Array.from({ length: 6 }, (_, i) => ({
    label: String(currentYear + i),
    value: currentYear + i,
  }))
})

// ── Product line management ───────────────────────────────────────────────────
function addProduct() {
  if (products.value.length < 5) {
    products.value.push({ name: '', productType: 'service', driverType: 'flat' })
  }
}

function removeProduct(i: number) {
  products.value.splice(i, 1)
}

// ── Balance helpers ───────────────────────────────────────────────────────────
const totalAssets = computed(() =>
  openingBalance.noncurrentAssets + openingBalance.inventories +
  openingBalance.customerReceivables + openingBalance.cashAndSecurities
)

const totalLiabilities = computed(() =>
  openingBalance.shareCapital + openingBalance.retainedEarnings +
  openingBalance.loansAndDebt + openingBalance.supplierPayables +
  openingBalance.socialAndTaxDebts
)

const balanceGap = computed(() => totalAssets.value - totalLiabilities.value)

// ── WC conversion (days → fractions) ─────────────────────────────────────────
function paymentTermFractions(days: string) {
  return {
    d0:  days === '0'  ? '1' : '0',
    d30: days === '30' ? '1' : '0',
    d60: days === '60' ? '1' : '0',
    d90: days === '90' ? '1' : '0',
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateCurrentStep(): boolean {
  const idx = currentStep.value

  if (idx === 0) {
    if (!details.name.trim()) {
      toast.add({ severity: 'warn', summary: 'Required', detail: 'Please enter a scenario name', life: 3000 })
      return false
    }
  }

  if (idx === 1) {
    if (!planning.forecastStartYear) {
      toast.add({ severity: 'warn', summary: 'Required', detail: 'Please select a forecast start year', life: 3000 })
      return false
    }
  }

  const revIdx = revenueStepIndex.value
  if (idx === revIdx) {
    const hasName = products.value.some(p => p.name.trim())
    if (!hasName) {
      toast.add({ severity: 'warn', summary: 'Required', detail: 'Add at least one revenue line name', life: 3000 })
      return false
    }
  }

  return true
}

// ── Navigation ────────────────────────────────────────────────────────────────
function nextStep() {
  if (!validateCurrentStep()) return
  if (currentStep.value < reviewStepIndex.value) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function goToStep(idx: number) {
  if (idx < currentStep.value) currentStep.value = idx
}

// ── Finish wizard ─────────────────────────────────────────────────────────────
async function finishWizard() {
  if (!validateCurrentStep()) return
  if (!props.planId) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No plan selected', life: 3000 })
    return
  }

  isLoading.value = true
  try {
    // Ensure activePlan is set (guards against hard-reload on the wizard URL)
    if (!planStore.activePlan) {
      await planStore.fetchPlan(props.planId)
    }

    // 1. Create the scenario
    const scenario = await scenarioStore.createScenario(props.planId, {
      name: details.name.trim(),
      description: details.description.trim(),
    })

    // Make it active so settingsStore.basePath() resolves correctly
    scenarioStore.setActive(scenario)

    // 2. Update planning config + key rates in a single call
    const forecastStart = `${planning.forecastStartYear}-01-01`
    await settingsStore.updateConfig({
      country:               planning.country,
      forecastStart,
      firstFiscalYearMonths: planning.firstFiscalYearMonths,
      currencySymbol:        planning.currencySymbol,
      language:              planning.language as 'fr' | 'en',
      salaryMonthsPerYear:   planning.salaryMonthsPerYear,
      corporateTaxRate:      String(rates.corporateTaxRate / 100),
      vatRate:               String(rates.vatRate / 100),
      employerTaxRate:       String(rates.employerTaxRate / 100),
      discountRate:          String(rates.discountRate / 100),
      mltInterestRate:       String(rates.mltInterestRate / 100),
    })

    // 3. Pro: Opening Balance
    if (isPro.value) {
      await settingsStore.updateOpeningBalance({
        noncurrentAssets:    String(openingBalance.noncurrentAssets),
        inventories:         String(openingBalance.inventories),
        customerReceivables: String(openingBalance.customerReceivables),
        cashAndSecurities:   String(openingBalance.cashAndSecurities),
        shareCapital:        String(openingBalance.shareCapital),
        retainedEarnings:    String(openingBalance.retainedEarnings),
        loansAndDebt:        String(openingBalance.loansAndDebt),
        supplierPayables:    String(openingBalance.supplierPayables),
        socialAndTaxDebts:   String(openingBalance.socialAndTaxDebts),
      })

      // 4. Pro: Working Capital
      const cFracs = paymentTermFractions(wc.customerDays)
      const sFracs = paymentTermFractions(wc.supplierDays)
      await settingsStore.updateWcConfig({
        customerPct0Days:  cFracs.d0,
        customerPct30Days: cFracs.d30,
        customerPct60Days: cFracs.d60,
        customerPct90Days: cFracs.d90,
        supplierPct0Days:  sFracs.d0,
        supplierPct30Days: sFracs.d30,
        supplierPct60Days: sFracs.d60,
        supplierPct90Days: sFracs.d90,
      })
    }

    // 5. Create revenue lines (skip empty names)
    const validProducts = products.value.filter(p => p.name.trim())
    for (const p of validProducts) {
      await productStore.createProduct({
        name:                    p.name.trim(),
        productType:             p.productType,
        driverType:              isPro.value ? (p.driverType as any) : 'flat',
        directCostVariability:   'variable',
        externalChargeVariability: 'variable',
        taxVariability:          'variable',
        staffVariability:        'fixed',
        depreciationVariability: 'fixed',
      })
    }

    toast.add({ severity: 'success', summary: 'Done!', detail: 'Scenario created successfully', life: 3000 })

    // Navigate to the new scenario
    await router.push(`/plans/${props.planId}/scenarios/${scenario.id}`)
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || 'Something went wrong'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Toast />
    <UpgradeModal />

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-5">
      <div class="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">New Scenario</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ planStore.activePlan?.name || 'Your plan' }} ·
            <span :class="isPro ? 'text-violet-600 font-medium' : 'text-gray-500'">
              {{ isPro ? '✦ Pro Setup' : 'Quick Setup' }}
            </span>
          </p>
        </div>
        <button
          class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          @click="router.back()"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Steps bar -->
    <div class="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
      <div class="max-w-3xl mx-auto">
        <Steps
          :model="steps"
          :activeIndex="currentStep"
          class="wizard-steps"
          @click="(e: any) => goToStep(e.index)"
        />
      </div>
    </div>

    <!-- Content area -->
    <div class="max-w-3xl mx-auto px-6 py-8">

      <!-- ── Step 0: Scenario Details ─────────────────────────────────────── -->
      <div v-if="currentStep === 0">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Scenario Details</h2>
        <p class="text-sm text-gray-500 mb-6">Give your scenario a clear name so you can compare variants at a glance.</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Scenario Name <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="details.name"
              class="w-full"
              placeholder="e.g. Base Case, Conservative, Optimistic"
              autofocus
            />
            <p class="text-xs text-gray-400 mt-1">A short, descriptive label helps when comparing multiple scenarios.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <Textarea
              v-model="details.description"
              class="w-full"
              rows="3"
              placeholder="Summarise the key assumptions for this scenario — optional but useful for team members."
            />
          </div>
        </div>
      </div>

      <!-- ── Step 1: Planning Config ─────────────────────────────────────── -->
      <div v-else-if="currentStep === 1">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Planning Configuration</h2>
        <p class="text-sm text-gray-500 mb-6">Set your forecast horizon, country and currency. All fields can be changed later in Settings.</p>

        <div class="grid grid-cols-2 gap-5">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
            <Dropdown
              v-model="planning.country"
              :options="countryOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              placeholder="Select a country"
            />
            <p class="text-xs text-gray-400 mt-1">Tax rates and currency are automatically filled in from your country selection.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Forecast Start Year</label>
            <Dropdown
              v-model="planning.forecastStartYear"
              :options="forecastYearOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">First Fiscal Year</label>
            <Dropdown
              v-model="planning.firstFiscalYearMonths"
              :options="fiscalMonthOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <p class="text-xs text-gray-400 mt-1">Use less than 12 months for a partial first year.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Currency Symbol</label>
            <InputText v-model="planning.currencySymbol" class="w-full" placeholder="€" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
            <Dropdown
              v-model="planning.language"
              :options="languageOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Salary Months / Year</label>
            <Dropdown
              v-model="planning.salaryMonthsPerYear"
              :options="salaryMonthOptions"
              optionLabel="label"
              optionValue="value"
              class="w-half"
            />
            <p class="text-xs text-gray-400 mt-1">13th month bonuses are common in Belgium, France and Luxembourg.</p>
          </div>
        </div>
      </div>

      <!-- ── Step 2: Key Rates ──────────────────────────────────────────── -->
      <div v-else-if="currentStep === 2">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Key Rates</h2>
        <p class="text-sm text-gray-500 mb-6">
          Statutory rates pre-filled from <strong>{{ planning.country }}</strong>. Edit if your situation differs.
        </p>

        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Corporate Tax Rate %</label>
            <InputNumber
              v-model="rates.corporateTaxRate"
              :min="0" :max="100" :minFractionDigits="1" :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">VAT Rate %</label>
            <InputNumber
              v-model="rates.vatRate"
              :min="0" :max="100" :minFractionDigits="1" :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Employer Social Charges %</label>
            <InputNumber
              v-model="rates.employerTaxRate"
              :min="0" :max="100" :minFractionDigits="2" :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">MLT Interest Rate %</label>
            <InputNumber
              v-model="rates.mltInterestRate"
              :min="0" :max="30" :minFractionDigits="1" :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
            />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Discount Rate % <span class="text-xs font-normal text-gray-400">(for NPV / DCF)</span>
            </label>
            <InputNumber
              v-model="rates.discountRate"
              :min="0" :max="50" :minFractionDigits="1" :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
            />
            <p class="text-xs text-gray-400 mt-1">Typically your WACC or a required rate of return (10 % is a common default).</p>
          </div>
        </div>
      </div>

      <!-- ── Step 3 (Pro): Opening Balance ────────────────────────────── -->
      <div v-else-if="isPro && currentStep === 3">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Opening Balance</h2>
        <p class="text-sm text-gray-500 mb-6">
          Enter your balance sheet at the start of the forecast.
          Leave fields at 0 for a greenfield startup.
        </p>

        <div class="grid grid-cols-2 gap-x-8 gap-y-4">
          <!-- Assets column -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Assets</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm text-gray-700 mb-1">Non-current Assets</label>
                <InputNumber v-model="openingBalance.noncurrentAssets" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Inventories</label>
                <InputNumber v-model="openingBalance.inventories" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Customer Receivables</label>
                <InputNumber v-model="openingBalance.customerReceivables" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Cash &amp; Securities</label>
                <InputNumber v-model="openingBalance.cashAndSecurities" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
            </div>

            <!-- Total Assets -->
            <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between text-sm font-semibold">
              <span class="text-gray-700">Total Assets</span>
              <span class="text-blue-600">{{ planning.currencySymbol }} {{ totalAssets.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Liabilities column -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Equity &amp; Liabilities</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm text-gray-700 mb-1">Share Capital</label>
                <InputNumber v-model="openingBalance.shareCapital" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Retained Earnings</label>
                <InputNumber v-model="openingBalance.retainedEarnings" :prefix="planning.currencySymbol + ' '" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Loans &amp; Debt</label>
                <InputNumber v-model="openingBalance.loansAndDebt" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Supplier Payables</label>
                <InputNumber v-model="openingBalance.supplierPayables" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1">Social &amp; Tax Debts</label>
                <InputNumber v-model="openingBalance.socialAndTaxDebts" :prefix="planning.currencySymbol + ' '" :min="0" class="w-full" :useGrouping="true" />
              </div>
            </div>

            <!-- Total Liabilities -->
            <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between text-sm font-semibold">
              <span class="text-gray-700">Total L+E</span>
              <span class="text-blue-600">{{ planning.currencySymbol }} {{ totalLiabilities.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Balance gap indicator -->
        <div
          v-if="totalAssets !== totalLiabilities && (totalAssets > 0 || totalLiabilities > 0)"
          class="mt-5 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          :class="balanceGap === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'"
        >
          <i :class="balanceGap === 0 ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" />
          <span v-if="balanceGap > 0">Assets exceed liabilities by {{ planning.currencySymbol }} {{ Math.abs(balanceGap).toLocaleString() }} — check for missing liabilities or equity.</span>
          <span v-else>Liabilities exceed assets by {{ planning.currencySymbol }} {{ Math.abs(balanceGap).toLocaleString() }} — check for missing assets.</span>
        </div>
      </div>

      <!-- ── Step 4 (Pro): Working Capital ─────────────────────────────── -->
      <div v-else-if="isPro && currentStep === 4">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Cash Flow Timing</h2>
        <p class="text-sm text-gray-500 mb-6">
          Set typical payment terms. These drive your working capital requirement forecast.
          You can configure more detailed bucket distributions later in Settings.
        </p>

        <div class="grid grid-cols-2 gap-8">
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i class="pi pi-arrow-down text-green-500" /> Customers pay you
            </h3>
            <Dropdown
              v-model="wc.customerDays"
              :options="paymentTermOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <p class="text-xs text-gray-400 mt-2">How long before your invoices are typically settled.</p>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i class="pi pi-arrow-up text-red-400" /> You pay suppliers
            </h3>
            <Dropdown
              v-model="wc.supplierDays"
              :options="paymentTermOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <p class="text-xs text-gray-400 mt-2">Typical payment delay on your purchase invoices.</p>
          </div>
        </div>

        <!-- Working capital impact preview -->
        <div class="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
          <p class="font-medium mb-1">Working Capital Impact</p>
          <p v-if="wc.customerDays > wc.supplierDays">
            Customers pay in <strong>{{ wc.customerDays }} days</strong> but you pay suppliers in <strong>{{ wc.supplierDays }} days</strong> —
            you'll need cash to bridge the gap between billing and collection.
          </p>
          <p v-else-if="wc.customerDays < wc.supplierDays">
            You collect in <strong>{{ wc.customerDays }} days</strong> and pay suppliers in <strong>{{ wc.supplierDays }} days</strong> —
            a favourable cycle that generates cash from operations.
          </p>
          <p v-else>
            Symmetric terms — your working capital requirement will follow revenue growth closely.
          </p>
        </div>
      </div>

      <!-- ── Revenue Lines ───────────────────────────────────────────── -->
      <div v-else-if="currentStep === revenueStepIndex">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Revenue Lines</h2>
        <p class="text-sm text-gray-500 mb-6">
          Add the main products or services you plan to sell.
          You can add more revenue lines after the wizard.
        </p>

        <div class="space-y-4">
          <div
            v-for="(product, i) in products"
            :key="i"
            class="flex gap-3 items-start p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
          >
            <div class="flex-1 grid gap-3" :class="isPro ? 'grid-cols-3' : 'grid-cols-2'">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <InputText v-model="product.name" class="w-full text-sm" :placeholder="'e.g. ' + (i === 0 ? 'Consulting services' : i === 1 ? 'Annual SaaS license' : 'Product sales')" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <Dropdown
                  v-model="product.productType"
                  :options="productTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full text-sm"
                />
              </div>
              <div v-if="isPro">
                <label class="block text-xs font-medium text-gray-500 mb-1">Revenue Driver</label>
                <Dropdown
                  v-model="product.driverType"
                  :options="driverTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full text-sm"
                />
              </div>
            </div>
            <button
              v-if="products.length > 1"
              class="text-gray-300 hover:text-red-400 transition-colors mt-6 shrink-0"
              @click="removeProduct(i)"
              title="Remove"
            >
              <i class="pi pi-times-circle text-lg" />
            </button>
          </div>
        </div>

        <button
          v-if="products.length < 5"
          class="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          @click="addProduct"
        >
          <i class="pi pi-plus-circle" /> Add another revenue line
        </button>

        <p v-if="!isPro" class="mt-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
          Upgrade to Pro to set a revenue driver (growth rate, seasonal, market share) for each line from day one.
        </p>
      </div>

      <!-- ── Review ──────────────────────────────────────────────────── -->
      <div v-else-if="currentStep === reviewStepIndex">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">Review &amp; Create</h2>
        <p class="text-sm text-gray-500 mb-6">Everything looks good? Hit <strong>Create Scenario</strong> and you're ready to forecast.</p>

        <div class="space-y-4">
          <!-- Summary card -->
          <Card class="border border-gray-100 shadow-sm">
            <template #title>
              <span class="text-sm font-semibold text-gray-700">{{ details.name || '—' }}</span>
            </template>
            <template #content>
              <p v-if="details.description" class="text-sm text-gray-500 mb-3">{{ details.description }}</p>
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span class="text-xs text-gray-400 block">Country</span>
                  <span class="font-medium">{{ planning.country }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block">Forecast starts</span>
                  <span class="font-medium">{{ planning.forecastStartYear }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block">Currency</span>
                  <span class="font-medium">{{ planning.currencySymbol }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block">Corp. Tax</span>
                  <span class="font-medium">{{ rates.corporateTaxRate }}%</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block">VAT</span>
                  <span class="font-medium">{{ rates.vatRate }}%</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block">Employer Charges</span>
                  <span class="font-medium">{{ rates.employerTaxRate }}%</span>
                </div>
              </div>
            </template>
          </Card>

          <!-- Pro summary: opening balance & WC -->
          <div v-if="isPro" class="grid grid-cols-2 gap-4">
            <Card class="border border-gray-100 shadow-sm">
              <template #title><span class="text-sm font-semibold text-gray-700">Opening Balance</span></template>
              <template #content>
                <div class="text-sm space-y-1">
                  <div class="flex justify-between">
                    <span class="text-gray-500">Total Assets</span>
                    <span class="font-medium">{{ planning.currencySymbol }} {{ totalAssets.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Total L+E</span>
                    <span class="font-medium">{{ planning.currencySymbol }} {{ totalLiabilities.toLocaleString() }}</span>
                  </div>
                  <div
                    v-if="balanceGap !== 0"
                    class="flex justify-between text-amber-600"
                  >
                    <span>Gap</span>
                    <span>{{ planning.currencySymbol }} {{ Math.abs(balanceGap).toLocaleString() }}</span>
                  </div>
                </div>
              </template>
            </Card>

            <Card class="border border-gray-100 shadow-sm">
              <template #title><span class="text-sm font-semibold text-gray-700">Payment Terms</span></template>
              <template #content>
                <div class="text-sm space-y-1">
                  <div class="flex justify-between">
                    <span class="text-gray-500">Customers pay in</span>
                    <span class="font-medium">{{ wc.customerDays === '0' ? 'Immediate' : wc.customerDays + ' days' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">You pay suppliers in</span>
                    <span class="font-medium">{{ wc.supplierDays === '0' ? 'Immediate' : wc.supplierDays + ' days' }}</span>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Revenue lines summary -->
          <Card class="border border-gray-100 shadow-sm">
            <template #title><span class="text-sm font-semibold text-gray-700">Revenue Lines</span></template>
            <template #content>
              <div class="space-y-2">
                <div
                  v-for="(p, i) in products.filter(p => p.name)"
                  :key="i"
                  class="flex items-center gap-3 text-sm"
                >
                  <span class="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                  <span class="font-medium">{{ p.name }}</span>
                  <span class="text-gray-400 capitalize">{{ p.productType }}</span>
                  <span v-if="isPro" class="text-gray-400 capitalize">· {{ p.driverType }}</span>
                </div>
                <p v-if="!products.some(p => p.name)" class="text-gray-400 italic">No revenue lines added.</p>
              </div>
            </template>
          </Card>
        </div>
      </div>

    </div>

    <!-- Footer navigation -->
    <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
      <div class="max-w-3xl mx-auto flex items-center justify-between">
        <Button
          label="Back"
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          :disabled="currentStep === 0"
          @click="prevStep"
        />

        <span class="text-xs text-gray-400">
          Step {{ currentStep + 1 }} of {{ steps.length }}
        </span>

        <div class="flex gap-3">
          <Button
            v-if="currentStep < reviewStepIndex"
            label="Continue"
            icon="pi pi-arrow-right"
            iconPos="right"
            @click="nextStep"
          />
          <Button
            v-else
            label="Create Scenario"
            icon="pi pi-check"
            iconPos="right"
            severity="success"
            :loading="isLoading"
            @click="finishWizard"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-steps :deep(.p-steps-item) {
  cursor: pointer;
}
.wizard-steps :deep(.p-steps-item.p-highlight .p-steps-number) {
  background: var(--primary-color);
}
</style>
