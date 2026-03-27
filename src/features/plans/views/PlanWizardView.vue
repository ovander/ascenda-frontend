<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import api from '@/composables/useApi'
import { useDecimal } from '@/composables/useDecimal'
import { useTierGate } from '@/composables/useTierGate'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const router = useRouter()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { getLocale } = useDecimal()
const { isPro } = useTierGate()
const toast = useToast()

const currentStep = ref(0)
const isLoading = ref(false)

// ── Country rate presets (mirrors backend country_defaults.go) ───
const countryPresets: Record<string, { vat: number; corp: number; employer: number; mlt: number; lang: string; currency: string }> = {
  BE: { vat: 21, corp: 25,   employer: 27.67, mlt: 3,   lang: 'fr', currency: '€' },
  FR: { vat: 20, corp: 25,   employer: 42,    mlt: 3,   lang: 'fr', currency: '€' },
  LU: { vat: 17, corp: 17,   employer: 12,    mlt: 3,   lang: 'fr', currency: '€' },
  NL: { vat: 21, corp: 25.8, employer: 20,    mlt: 3,   lang: 'nl', currency: '€' },
  DE: { vat: 19, corp: 29.9, employer: 20,    mlt: 3.5, lang: 'de', currency: '€' },
  ES: { vat: 21, corp: 25,   employer: 30,    mlt: 3.5, lang: 'es', currency: '€' },
  IT: { vat: 22, corp: 27.9, employer: 30,    mlt: 3.5, lang: 'it', currency: '€' },
  PT: { vat: 23, corp: 21,   employer: 23.75, mlt: 3.5, lang: 'pt', currency: '€' },
  IE: { vat: 23, corp: 12.5, employer: 11.05, mlt: 3,   lang: 'en', currency: '€' },
  CH: { vat: 8.1,corp: 18,   employer: 6.35,  mlt: 2,   lang: 'fr', currency: 'CHF' },
  GB: { vat: 20, corp: 25,   employer: 13.8,  mlt: 4.5, lang: 'en', currency: '£' },
  US: { vat: 0,  corp: 21,   employer: 7.65,  mlt: 5,   lang: 'en', currency: '$' },
  CA: { vat: 5,  corp: 26.5, employer: 7.6,   mlt: 4.5, lang: 'fr', currency: 'CA$' },
}

const countryOptions = [
  { label: 'Belgium (BE)', value: 'BE' },
  { label: 'France (FR)', value: 'FR' },
  { label: 'Luxembourg (LU)', value: 'LU' },
  { label: 'Netherlands (NL)', value: 'NL' },
  { label: 'Germany (DE)', value: 'DE' },
  { label: 'Spain (ES)', value: 'ES' },
  { label: 'Italy (IT)', value: 'IT' },
  { label: 'Portugal (PT)', value: 'PT' },
  { label: 'Ireland (IE)', value: 'IE' },
  { label: 'Switzerland (CH)', value: 'CH' },
  { label: 'United Kingdom (GB)', value: 'GB' },
  { label: 'United States (US)', value: 'US' },
  { label: 'Canada (CA)', value: 'CA' },
]

// ── Form data across all steps ──────────────────────────────────
const formData = reactive<Record<string, any>>({
  // Step 1: Plan Details
  planName: '',
  description: '',
  country: 'BE',
  language: 'fr',

  // Step 2: General Config
  companyName: '',
  forecastStart: new Date().toISOString().split('T')[0],
  currencySymbol: '€',

  // Step 3: Key Rates
  vatRate: 20,
  corporateTaxRate: 25,
  employerTaxRate: 42,

  // Step 4: Opening Balance
  noncurrentAssets: 0,
  inventories: 0,
  customerReceivables: 0,
  cashAndSecurities: 0,
  shareCapital: 0,
  retainedEarnings: 0,
  loansAndDebt: 0,
  supplierPayables: 0,

  // Step 5: Working Capital
  customerPaymentDays: 30,
  supplierPaymentDays: 30,
  inventoryDays: 30,
})

// ── Products (step 6) ───────────────────────────────────────────
type WizardDriverType = 'generic' | 'consulting' | 'saas' | 'industry' | 'marketplace' | 'media' | 'session_based'

interface WizardProduct {
  name: string
  driverType: WizardDriverType
  baseUnitPrice: number | null
  rawMaterialCost: number | null
  unitsSoldY1: number | null
  unitsSoldY2: number | null
  unitsSoldY3: number | null
  unitsSoldY4: number | null
  unitsSoldY5: number | null
}

const driverOptions: { label: string; value: WizardDriverType; icon: string }[] = [
  { value: 'generic',       label: 'Generic',             icon: '📋' },
  { value: 'consulting',    label: 'Consulting / Service', icon: '🤝' },
  { value: 'saas',          label: 'SaaS / Subscription',  icon: '☁️' },
  { value: 'industry',      label: 'Manufacturing',        icon: '🏭' },
  { value: 'marketplace',   label: 'Marketplace',          icon: '🛒' },
  { value: 'media',         label: 'Media / Ads',          icon: '📺' },
  { value: 'session_based', label: 'Training / Events',    icon: '🎓' },
]

function productTypeFromDriver(dt: WizardDriverType): 'service' | 'product' {
  return dt === 'consulting' || dt === 'session_based' ? 'service' : 'product'
}

function emptyProduct(): WizardProduct {
  return { name: '', driverType: 'generic', baseUnitPrice: null, rawMaterialCost: null, unitsSoldY1: null, unitsSoldY2: null, unitsSoldY3: null, unitsSoldY4: null, unitsSoldY5: null }
}

const products = ref<WizardProduct[]>([emptyProduct()])

function addProduct() {
  products.value.push(emptyProduct())
}

function removeProduct(idx: number) {
  if (products.value.length > 1) products.value.splice(idx, 1)
}

// ── Staff (step 7) ──────────────────────────────────────────────
const staffCategories = [
  { key: 'rnd_engineers', label: 'R&D Engineers' },
  { key: 'prod_engineers', label: 'Production Engineers' },
  { key: 'prod_technicians', label: 'Production Technicians' },
  { key: 'sales_team', label: 'Sales Team' },
  { key: 'marketing_team', label: 'Marketing Team' },
  { key: 'admin_managers', label: 'Admin & Managers' },
  { key: 'admin_assistants', label: 'Admin Assistants' },
  { key: 'executive_team', label: 'Executive Team' },
]

interface WizardStaffRow {
  category: string
  label: string
  monthlySalary: number | null
  fteY1: number | null
  fteY2: number | null
  fteY3: number | null
  fteY4: number | null
  fteY5: number | null
}

const staffRows = ref<WizardStaffRow[]>(
  staffCategories.map(c => ({
    category: c.key,
    label: c.label,
    monthlySalary: null,
    fteY1: null, fteY2: null, fteY3: null, fteY4: null, fteY5: null,
  }))
)

// ── Capex (step 8) ──────────────────────────────────────────────
const capexCategories = [
  { key: 'land', label: 'Land', years: 0 },
  { key: 'buildings', label: 'Buildings', years: 20 },
  { key: 'setup_expenses', label: 'Setup Expenses', years: 5 },
  { key: 'patents_trademarks', label: 'Patents & Trademarks', years: 5 },
  { key: 'rnd_expenses', label: 'R&D Expenses', years: 5 },
  { key: 'prototypes', label: 'Prototypes', years: 3 },
  { key: 'equipment_tools', label: 'Equipment & Tools', years: 7 },
  { key: 'office_furniture', label: 'Office Furniture', years: 10 },
  { key: 'computer_hw_sw', label: 'Computer HW/SW', years: 3 },
  { key: 'vehicles', label: 'Vehicles', years: 5 },
]

interface WizardCapexRow {
  category: string
  label: string
  depreciationYears: number
  amtY1: number | null
  amtY2: number | null
  amtY3: number | null
  amtY4: number | null
  amtY5: number | null
}

const capexRows = ref<WizardCapexRow[]>(
  capexCategories.map(c => ({
    category: c.key,
    label: c.label,
    depreciationYears: c.years,
    amtY1: null, amtY2: null, amtY3: null, amtY4: null, amtY5: null,
  }))
)

// ── Opex & Financing (step 9) ───────────────────────────────────
const opexLines = [
  { key: 'rent', label: 'Rent & Facilities', subcategory: 'Facilities' },
  { key: 'insurance', label: 'Insurance', subcategory: 'Facilities' },
  { key: 'utilities', label: 'Utilities', subcategory: 'Facilities' },
  { key: 'telecom', label: 'Telecom & Internet', subcategory: 'General' },
  { key: 'travel', label: 'Travel & Expenses', subcategory: 'General' },
  { key: 'marketing_spend', label: 'Marketing Spend', subcategory: 'Sales & Marketing' },
  { key: 'professional_fees', label: 'Professional Fees', subcategory: 'General' },
  { key: 'other_opex', label: 'Other Operating Expenses', subcategory: 'General' },
]

interface WizardOpexRow {
  lineId: string
  label: string
  subcategory: string
  amtY1: number | null
  amtY2: number | null
  amtY3: number | null
  amtY4: number | null
  amtY5: number | null
}

const opexRows = ref<WizardOpexRow[]>(
  opexLines.map(l => ({
    lineId: l.key,
    label: l.label,
    subcategory: l.subcategory,
    amtY1: null, amtY2: null, amtY3: null, amtY4: null, amtY5: null,
  }))
)

// Financing
const financing = reactive({
  shareCapitalIncrease: null as number | null,
  longTermLoan: null as number | null,
  loanTermYears: 5,
  loanInterestRate: 4,
})

// ── Year headers ────────────────────────────────────────────────
const yearHeaders = computed(() => {
  const start = new Date(formData.forecastStart).getFullYear() || new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => `Y${i + 1} (${start + i})`)
})

// ── Auto-populate rates when country changes ─────────────────────
watch(() => formData.country, (code: string) => {
  const p = countryPresets[code]
  if (!p) return
  formData.vatRate = p.vat
  formData.corporateTaxRate = p.corp
  formData.employerTaxRate = p.employer
  formData.language = p.lang
  formData.currencySymbol = p.currency
})

// ── Cap Table (step 9, optional Pro feature) ─────────────────────
type WizardShareholderType = 'founder' | 'investor' | 'employee' | 'other'

interface WizardShareholder {
  name: string
  type: WizardShareholderType
  shares: number | null
  ownershipPct: number | null
  investedAmount: number | null
}

const wizardShareholders = ref<WizardShareholder[]>([])

function addWizardShareholder() {
  wizardShareholders.value.push({ name: '', type: 'founder', shares: null, ownershipPct: null, investedAmount: null })
}

function removeWizardShareholder(idx: number) {
  wizardShareholders.value.splice(idx, 1)
}

const shareholderTypeOptions = [
  { label: 'Founder', value: 'founder' },
  { label: 'Investor', value: 'investor' },
  { label: 'Employee', value: 'employee' },
  { label: 'Other', value: 'other' },
]

// ── Steps config ────────────────────────────────────────────────
const steps = [
  { label: 'Plan Details', icon: 'pi pi-file' },
  { label: 'General Config', icon: 'pi pi-cog' },
  { label: 'Key Rates', icon: 'pi pi-percentage' },
  { label: 'Opening Balance', icon: 'pi pi-money-bill' },
  { label: 'Working Capital', icon: 'pi pi-chart-bar' },
  { label: 'Products / Services', icon: 'pi pi-inbox' },
  { label: 'Staff', icon: 'pi pi-users' },
  { label: 'Capex', icon: 'pi pi-building' },
  { label: 'Opex & Financing', icon: 'pi pi-chart-pie' },
  { label: 'Cap Table', icon: 'pi pi-chart-pie', optional: true, requiresPro: true },
  { label: 'Review', icon: 'pi pi-check' },
]

// ── Computed summaries for review ───────────────────────────────
const productCount = computed(() => products.value.filter(p => p.name.trim()).length)
const totalStaffY1 = computed(() => staffRows.value.reduce((sum, r) => sum + (r.fteY1 || 0), 0))
const totalCapexY1 = computed(() => capexRows.value.reduce((sum, r) => sum + (r.amtY1 || 0), 0))
const totalOpexY1 = computed(() => opexRows.value.reduce((sum, r) => sum + (r.amtY1 || 0), 0))
const totalShareholders = computed(() => wizardShareholders.value.filter(s => s.name.trim()).length)

// Auto-derived share capital from cap table (used on Opening Balance step as preview)
const capTableDerivedCapital = computed(() => {
  if (!isPro.value) return 0
  return wizardShareholders.value
    .filter(s => s.name.trim())
    .reduce((sum, s) => sum + (s.investedAmount ?? 0), 0)
})

// ── Validation ──────────────────────────────────────────────────
function validateStep(): boolean {
  switch (currentStep.value) {
    case 0:
      if (!formData.planName.trim()) {
        toast.add({ severity: 'warn', summary: 'Validation', detail: 'Plan name is required', life: 3000 })
        return false
      }
      return true
    case 1:
      if (!formData.companyName.trim()) {
        toast.add({ severity: 'warn', summary: 'Validation', detail: 'Company name is required', life: 3000 })
        return false
      }
      return true
    case 5:
      if (!products.value.some(p => p.name.trim())) {
        toast.add({ severity: 'warn', summary: 'Validation', detail: 'Add at least one product', life: 3000 })
        return false
      }
      return true
    default:
      return true
  }
}

function nextStep() {
  if (validateStep()) {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++
    }
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// ── Helper: build API base path ─────────────────────────────────
function scenarioPath(planId: string, scenarioId: string) {
  return `/api/v1/plans/${planId}/scenarios/${scenarioId}`
}

// ── Finish wizard ───────────────────────────────────────────────
async function finishWizard() {
  isLoading.value = true
  try {
    // 1. Create plan
    const plan = await planStore.createPlan({
      name: formData.planName,
      description: formData.description,
      country: formData.country,
    })

    // 2. Create base scenario
    const scenario = await scenarioStore.createScenario(plan.id, {
      name: 'Base',
      description: 'Base scenario created by wizard',
    })

    const base = scenarioPath(plan.id, scenario.id)

    // 3. Save settings config
    try {
      await api.put(`${base}/settings/config`, {
        language: formData.language,
        companyName: formData.companyName,
        forecastStart: formData.forecastStart ? new Date(formData.forecastStart).toISOString() : undefined,
        currencySymbol: formData.currencySymbol,
        vatRate: String(formData.vatRate || 0),
        corporateTaxRate: String(formData.corporateTaxRate || 0),
        employerTaxRate: String(formData.employerTaxRate || 0),
      })
    } catch { /* non-fatal */ }

    // 4. Save opening balance
    // Auto-derive shareCapital from cap table total invested (Pro tier only)
    if (isPro.value && wizardShareholders.value.length > 0) {
      const totalInvested = wizardShareholders.value
        .filter(s => s.name.trim())
        .reduce((sum, s) => sum + (s.investedAmount ?? 0), 0)
      if (totalInvested > 0) {
        formData.shareCapital = totalInvested
      }
    }
    try {
      await api.put(`${base}/settings/opening-balance`, {
        noncurrentAssets: String(formData.noncurrentAssets || 0),
        inventories: String(formData.inventories || 0),
        customerReceivables: String(formData.customerReceivables || 0),
        cashAndSecurities: String(formData.cashAndSecurities || 0),
        shareCapital: String(formData.shareCapital || 0),
        retainedEarnings: String(formData.retainedEarnings || 0),
        loansAndDebt: String(formData.loansAndDebt || 0),
        supplierPayables: String(formData.supplierPayables || 0),
      })
    } catch { /* non-fatal */ }

    // 5. Save products
    const validProducts = products.value.filter(p => p.name.trim())
    for (const prod of validProducts) {
      try {
        const driverType = prod.driverType || 'generic'
        const created = await api.post(`${base}/products`, {
          name: prod.name,
          driverType,
          productType: productTypeFromDriver(driverType),
        })
        const productId = created.data?.id
        if (productId) {
          // Save assumptions (price & cost for each year)
          const assumptions = Array.from({ length: 5 }, (_, i) => ({
            yearIndex: i,
            baseUnitPrice: String(prod.baseUnitPrice || 0),
            rawMaterialCost: String(prod.rawMaterialCost || 0),
          }))
          await api.put(`${base}/products/${productId}/assumptions`, assumptions).catch(() => {})

          // Save volumes
          const yearVolumes = [prod.unitsSoldY1, prod.unitsSoldY2, prod.unitsSoldY3, prod.unitsSoldY4, prod.unitsSoldY5]
          const volumes = yearVolumes.flatMap((units, i) =>
            units ? [{ yearIndex: i, zone: 'france', channel: 'direct', unitsSold: units }] : []
          )
          if (volumes.length) {
            await api.put(`${base}/products/${productId}/volumes`, volumes).catch(() => {})
          }
        }
      } catch { /* continue with next product */ }
    }

    // 6. Save staff headcounts + salaries
    const headcounts = staffRows.value.flatMap(row => {
      const years = [row.fteY1, row.fteY2, row.fteY3, row.fteY4, row.fteY5]
      return years
        .map((fte, i) => fte != null ? { category: row.category, yearIndex: i, fte: String(fte) } : null)
        .filter(Boolean)
    })
    if (headcounts.length) {
      await api.put(`${base}/staff/headcounts`, headcounts).catch(() => {})
    }

    const salaries = staffRows.value
      .filter(row => row.monthlySalary != null)
      .flatMap(row =>
        Array.from({ length: 5 }, (_, i) => ({
          category: row.category,
          yearIndex: i,
          monthlyGrossSalary: String(row.monthlySalary),
        }))
      )
    if (salaries.length) {
      await api.put(`${base}/staff/salaries`, salaries).catch(() => {})
    }

    // 7. Save capex entries
    const capexEntries = capexRows.value.flatMap(row => {
      const years = [row.amtY1, row.amtY2, row.amtY3, row.amtY4, row.amtY5]
      return years
        .map((amt, i) => amt ? {
          category: row.category,
          yearIndex: i,
          amount: String(amt),
          depreciationYears: row.depreciationYears,
        } : null)
        .filter(Boolean)
    })
    if (capexEntries.length) {
      await api.put(`${base}/capex`, capexEntries).catch(() => {})
    }

    // 8. Save opex entries
    const opexEntries = opexRows.value.flatMap(row => {
      const years = [row.amtY1, row.amtY2, row.amtY3, row.amtY4, row.amtY5]
      return years
        .map((amt, i) => amt ? {
          lineId: row.lineId,
          yearIndex: i,
          amount: String(amt),
        } : null)
        .filter(Boolean)
    })
    if (opexEntries.length) {
      await api.put(`${base}/opex`, opexEntries).catch(() => {})
    }

    // 9. Save financing (as fiplan entries)
    const fiplanEntries: any[] = []
    if (financing.shareCapitalIncrease) {
      fiplanEntries.push({ lineId: 'share_capital_increase', yearIndex: 0, amount: String(financing.shareCapitalIncrease) })
    }
    if (financing.longTermLoan) {
      fiplanEntries.push({ lineId: 'long_term_loan', yearIndex: 0, amount: String(financing.longTermLoan) })
    }
    if (fiplanEntries.length) {
      await api.put(`${base}/fiplan`, fiplanEntries).catch(() => {})
    }

    // 10. Save cap table shareholders (Pro tier only, non-fatal)
    if (isPro.value) {
      const validShareholders = wizardShareholders.value.filter(s => s.name.trim())
      for (const sh of validShareholders) {
        await api.post(`/api/v1/plans/${plan.id}/cap-table/shareholders`, {
          name: sh.name,
          type: sh.type,
          shares: sh.shares ?? 0,
          ownershipPct: String(sh.ownershipPct ?? 0),
          investedAmount: String(sh.investedAmount ?? 0),
        }).catch(() => {})
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Plan Created',
      detail: `"${plan.name}" with ${validProducts.length} product(s) and base scenario`,
      life: 4000,
    })

    await router.push(`/plans/${plan.id}`)
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.message || 'Failed to create plan',
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Create New Plan</h1>
      <p class="text-gray-600">Follow the steps below to set up your financial plan</p>
    </div>

    <Toast />

    <!-- Step progress bar -->
    <div class="mb-8">
      <div class="flex items-center gap-1">
        <template v-for="(step, i) in steps" :key="i">
          <div
            class="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 cursor-pointer"
            :class="i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'"
            :title="step.label"
            @click="i <= currentStep ? currentStep = i : null"
          >
            <i v-if="i < currentStep" class="pi pi-check text-xs" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div v-if="i < steps.length - 1" class="flex-1 h-0.5" :class="i < currentStep ? 'bg-green-500' : 'bg-gray-200'" />
        </template>
      </div>
      <p class="text-sm text-gray-600 mt-2 font-medium">{{ steps[currentStep].label }}</p>
    </div>

    <Card class="mb-6">
      <template #content>

      <!-- ═══ Step 1: Plan Details ═══ -->
      <div v-show="currentStep === 0" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Plan Details</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
          <InputText v-model="formData.planName" class="w-full" placeholder="e.g., 2025 Growth Plan" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea v-model="formData.description" class="w-full" rows="3" placeholder="Brief description of your plan" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <Select
            v-model="formData.country"
            :options="countryOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Select country"
          />
          <p class="text-xs text-gray-500 mt-1">Sets default tax rates, currency and language for this plan.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <Select
            v-model="formData.language"
            :options="[{ label: 'English', value: 'en' }, { label: 'Français', value: 'fr' }, { label: 'Deutsch', value: 'de' }, { label: 'Nederlands', value: 'nl' }, { label: 'Español', value: 'es' }, { label: 'Italiano', value: 'it' }, { label: 'Português', value: 'pt' }]"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <!-- ═══ Step 2: General Config ═══ -->
      <div v-show="currentStep === 1" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">General Configuration</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
          <InputText v-model="formData.companyName" class="w-full" placeholder="Your company name" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Forecast Start Date</label>
          <InputText v-model="formData.forecastStart" type="date" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
          <InputText v-model="formData.currencySymbol" class="w-full" />
        </div>
      </div>

      <!-- ═══ Step 3: Key Rates ═══ -->
      <div v-show="currentStep === 2" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Key Tax &amp; Cost Rates</h2>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
            <InputNumber v-model="formData.vatRate" :maxFractionDigits="2" suffix="%" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Corporate Tax Rate (%)</label>
            <InputNumber v-model="formData.corporateTaxRate" :maxFractionDigits="2" suffix="%" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Employer Tax Rate (%)</label>
            <InputNumber v-model="formData.employerTaxRate" :maxFractionDigits="2" suffix="%" class="w-full" />
          </div>
        </div>
      </div>

      <!-- ═══ Step 4: Opening Balance ═══ -->
      <div v-show="currentStep === 3" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Opening Balance Sheet</h2>
        <p class="text-sm text-gray-500">Enter your company's starting balance. Leave at 0 for a brand-new company.</p>
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-3">
            <h3 class="font-semibold text-gray-700 text-sm uppercase tracking-wide">Assets</h3>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Noncurrent Assets</label>
              <InputNumber v-model="formData.noncurrentAssets" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Inventories</label>
              <InputNumber v-model="formData.inventories" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Customer Receivables</label>
              <InputNumber v-model="formData.customerReceivables" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Cash &amp; Securities</label>
              <InputNumber v-model="formData.cashAndSecurities" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
          </div>
          <div class="space-y-3">
            <h3 class="font-semibold text-gray-700 text-sm uppercase tracking-wide">Liabilities &amp; Equity</h3>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Share Capital</label>
              <InputNumber
                v-model="formData.shareCapital"
                :maxFractionDigits="0"
                mode="decimal"
                class="w-full"
                :disabled="capTableDerivedCapital > 0"
              />
              <p v-if="capTableDerivedCapital > 0" class="text-xs text-amber-600 mt-1">
                <i class="pi pi-info-circle mr-1" />
                Auto-set from Cap Table: {{ capTableDerivedCapital.toLocaleString(getLocale()) }} {{ formData.currencySymbol }}
              </p>
              <p v-else-if="isPro" class="text-xs text-gray-400 mt-1">
                Will be overridden by Cap Table total invested amount (step 10)
              </p>
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Retained Earnings</label>
              <InputNumber v-model="formData.retainedEarnings" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Loans &amp; Debt</label>
              <InputNumber v-model="formData.loansAndDebt" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Supplier Payables</label>
              <InputNumber v-model="formData.supplierPayables" :maxFractionDigits="0" mode="decimal" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Step 5: Working Capital ═══ -->
      <div v-show="currentStep === 4" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Working Capital Configuration</h2>
        <p class="text-sm text-gray-500">Average payment and inventory terms for cash flow planning.</p>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Customer Payment Days</label>
            <InputNumber v-model="formData.customerPaymentDays" :maxFractionDigits="0" suffix=" days" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Supplier Payment Days</label>
            <InputNumber v-model="formData.supplierPaymentDays" :maxFractionDigits="0" suffix=" days" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Inventory Days</label>
            <InputNumber v-model="formData.inventoryDays" :maxFractionDigits="0" suffix=" days" class="w-full" />
          </div>
        </div>
      </div>

      <!-- ═══ Step 6: Products ═══ -->
      <div v-show="currentStep === 5" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-800">Products / Services</h2>
            <p class="text-sm text-gray-500">Define your products with pricing and projected sales volumes.</p>
          </div>
          <Button label="Add Product" icon="pi pi-plus" size="small" @click="addProduct" />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-600">
                <th class="py-2 pr-2 font-medium w-8">#</th>
                <th class="py-2 px-1 font-medium" style="min-width:140px">Product</th>
                <th v-if="isPro" class="py-2 px-1 font-medium" style="min-width:160px">Business Driver</th>
                <th class="py-2 px-1 font-medium w-24">Price</th>
                <th class="py-2 px-1 font-medium w-24">Cost</th>
                <th v-for="(h, i) in yearHeaders" :key="i" class="py-2 px-1 font-medium text-center w-20">{{ h }}</th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(prod, idx) in products" :key="idx" class="border-b border-gray-100">
                <td class="py-1 pr-2 text-gray-400 font-bold">{{ idx + 1 }}</td>
                <td class="py-1 px-1"><InputText v-model="prod.name" placeholder="Name" class="w-full" /></td>
                <td v-if="isPro" class="py-1 px-1">
                  <Select
                    v-model="prod.driverType"
                    :options="driverOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full text-sm"
                  >
                    <template #value="{ value }">
                      <span>{{ driverOptions.find(d => d.value === value)?.icon }} {{ driverOptions.find(d => d.value === value)?.label }}</span>
                    </template>
                    <template #option="{ option }">
                      <span>{{ option.icon }} {{ option.label }}</span>
                    </template>
                  </Select>
                </td>
                <td class="py-1 px-1"><InputNumber v-model="prod.baseUnitPrice" :maxFractionDigits="2" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.rawMaterialCost" :maxFractionDigits="2" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.unitsSoldY1" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.unitsSoldY2" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.unitsSoldY3" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.unitsSoldY4" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="prod.unitsSoldY5" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1">
                  <Button v-if="products.length > 1" icon="pi pi-trash" severity="danger" text rounded size="small" @click="removeProduct(idx)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Step 7: Staff ═══ -->
      <div v-show="currentStep === 6" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Staff Plan</h2>
        <p class="text-sm text-gray-500">Enter monthly gross salary and full-time equivalents (FTE) per year for each category.</p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-600">
                <th class="py-2 pr-3 font-medium w-48">Category</th>
                <th class="py-2 px-2 font-medium w-28">Monthly Salary</th>
                <th v-for="(h, i) in yearHeaders" :key="i" class="py-2 px-2 font-medium text-center w-20">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in staffRows" :key="row.category" class="border-b border-gray-100">
                <td class="py-2 pr-3 text-gray-700 font-medium">{{ row.label }}</td>
                <td class="py-1 px-1">
                  <InputNumber v-model="row.monthlySalary" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1" />
                </td>
                <td class="py-1 px-1"><InputNumber v-model="row.fteY1" :maxFractionDigits="1" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.fteY2" :maxFractionDigits="1" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.fteY3" :maxFractionDigits="1" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.fteY4" :maxFractionDigits="1" class="w-full" inputClass="text-sm p-1 text-center" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.fteY5" :maxFractionDigits="1" class="w-full" inputClass="text-sm p-1 text-center" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Step 8: Capex ═══ -->
      <div v-show="currentStep === 7" class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-800">Capital Expenditure (Capex)</h2>
        <p class="text-sm text-gray-500">Enter investment amounts per year. Depreciation years are pre-filled by asset type.</p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-600">
                <th class="py-2 pr-3 font-medium w-44">Asset Category</th>
                <th class="py-2 px-2 font-medium w-16 text-center">Depr.</th>
                <th v-for="(h, i) in yearHeaders" :key="i" class="py-2 px-2 font-medium text-center w-24">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in capexRows" :key="row.category" class="border-b border-gray-100">
                <td class="py-2 pr-3 text-gray-700 font-medium">{{ row.label }}</td>
                <td class="py-1 px-1 text-center text-gray-500">{{ row.depreciationYears > 0 ? `${row.depreciationYears}y` : '—' }}</td>
                <td class="py-1 px-1"><InputNumber v-model="row.amtY1" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.amtY2" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.amtY3" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.amtY4" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                <td class="py-1 px-1"><InputNumber v-model="row.amtY5" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Step 9: Opex & Financing ═══ -->
      <div v-show="currentStep === 8" class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-800">Operating Expenses (Opex)</h2>
          <p class="text-sm text-gray-500 mb-3">Annual operating expenses by category.</p>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-gray-600">
                  <th class="py-2 pr-3 font-medium w-52">Expense</th>
                  <th v-for="(h, i) in yearHeaders" :key="i" class="py-2 px-2 font-medium text-center w-24">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in opexRows" :key="row.lineId" class="border-b border-gray-100">
                  <td class="py-2 pr-3 text-gray-700">{{ row.label }}</td>
                  <td class="py-1 px-1"><InputNumber v-model="row.amtY1" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                  <td class="py-1 px-1"><InputNumber v-model="row.amtY2" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                  <td class="py-1 px-1"><InputNumber v-model="row.amtY3" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                  <td class="py-1 px-1"><InputNumber v-model="row.amtY4" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                  <td class="py-1 px-1"><InputNumber v-model="row.amtY5" :maxFractionDigits="0" class="w-full" inputClass="text-sm p-1 text-right" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="border-t pt-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">Financing</h3>
          <p class="text-sm text-gray-500 mb-3">Initial funding sources for the plan.</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Share Capital Increase</label>
              <InputNumber v-model="financing.shareCapitalIncrease" :maxFractionDigits="0" mode="decimal" class="w-full" placeholder="0" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Long-Term Loan Amount</label>
              <InputNumber v-model="financing.longTermLoan" :maxFractionDigits="0" mode="decimal" class="w-full" placeholder="0" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Loan Term</label>
              <InputNumber v-model="financing.loanTermYears" :maxFractionDigits="0" suffix=" years" class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Loan Interest Rate</label>
              <InputNumber v-model="financing.loanInterestRate" :maxFractionDigits="2" suffix="%" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Step 10: Cap Table (optional, Pro) ═══ -->
      <div v-show="currentStep === 9" class="space-y-5">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-gray-800">Cap Table</h2>
          <span class="inline-flex items-center rounded-full font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-300 text-[10px] px-2 py-0.5">PRO</span>
          <span class="text-sm text-gray-400 font-normal">(optional — you can skip this step)</span>
        </div>

        <!-- Pro gate in wizard -->
        <div v-if="!isPro" class="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <i class="pi pi-lock text-2xl text-amber-500 shrink-0"></i>
          <div>
            <p class="font-semibold text-amber-800">Pro feature</p>
            <p class="text-sm text-amber-700">Cap table is available on the Pro plan. You can skip this step and continue.</p>
          </div>
        </div>

        <template v-else>
          <p class="text-sm text-gray-500">Add founders, investors and key employees to your cap table. You can also add or edit shareholders later.</p>

          <DataTable :value="wizardShareholders" class="p-datatable-sm">
            <Column header="Name" style="width:220px">
              <template #body="{ data }">
                <InputText v-model="data.name" class="w-full" placeholder="Full name" />
              </template>
            </Column>
            <Column header="Type" style="width:150px">
              <template #body="{ data }">
                <Select v-model="data.type" :options="shareholderTypeOptions" optionLabel="label" optionValue="value" class="w-full" />
              </template>
            </Column>
            <Column header="Shares" style="width:130px">
              <template #body="{ data }">
                <InputNumber v-model="data.shares" :min="0" :useGrouping="true" class="w-full" inputClass="text-sm p-1 text-right" />
              </template>
            </Column>
            <Column header="Ownership %" style="width:130px">
              <template #body="{ data }">
                <InputNumber v-model="data.ownershipPct" :min="0" :max="100" :minFractionDigits="1" suffix="%" class="w-full" inputClass="text-sm p-1 text-right" />
              </template>
            </Column>
            <Column header="Invested (€)" style="width:140px">
              <template #body="{ data }">
                <InputNumber v-model="data.investedAmount" :min="0" :useGrouping="true" class="w-full" inputClass="text-sm p-1 text-right" />
              </template>
            </Column>
            <Column header="" style="width:50px">
              <template #body="{ index }">
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeWizardShareholder(index)" />
              </template>
            </Column>
          </DataTable>

          <Button label="Add Shareholder" icon="pi pi-plus" text @click="addWizardShareholder" />
        </template>
      </div>

      <!-- ═══ Step 11: Review & Summary ═══ -->
      <div v-show="currentStep === 10" class="space-y-5">
        <h2 class="text-xl font-semibold text-gray-800">Review &amp; Summary</h2>
        <p class="text-sm text-gray-500">Verify your plan setup before creating. You can always edit details later.</p>

        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 border rounded-lg bg-white shadow-sm">
            <span class="text-xs font-semibold text-gray-500 uppercase">Plan</span>
            <p class="text-xl font-bold text-blue-600 mt-1">{{ formData.planName || '—' }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formData.companyName }} · {{ formData.currencySymbol }}</p>
          </div>
          <div class="p-4 border rounded-lg bg-white shadow-sm">
            <span class="text-xs font-semibold text-gray-500 uppercase">Forecast Start</span>
            <p class="text-xl font-bold text-purple-600 mt-1">{{ formData.forecastStart }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formData.language === 'fr' ? 'Français' : 'English' }}</p>
          </div>
          <div class="p-4 border rounded-lg bg-white shadow-sm">
            <span class="text-xs font-semibold text-gray-500 uppercase">Key Rates</span>
            <p class="text-sm mt-1">VAT {{ formData.vatRate }}% · Corp. Tax {{ formData.corporateTaxRate }}%</p>
            <p class="text-xs text-gray-500">Employer {{ formData.employerTaxRate }}%</p>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-4">
          <div class="p-3 border rounded-lg bg-blue-50 text-center">
            <span class="text-xs font-semibold text-blue-600 uppercase">Products</span>
            <p class="text-2xl font-bold text-blue-700">{{ productCount }}</p>
          </div>
          <div class="p-3 border rounded-lg bg-green-50 text-center">
            <span class="text-xs font-semibold text-green-600 uppercase">Staff Y1</span>
            <p class="text-2xl font-bold text-green-700">{{ totalStaffY1 }} FTE</p>
          </div>
          <div class="p-3 border rounded-lg bg-orange-50 text-center">
            <span class="text-xs font-semibold text-orange-600 uppercase">Capex Y1</span>
            <p class="text-2xl font-bold text-orange-700">{{ (totalCapexY1 || 0).toLocaleString(getLocale()) }} {{ formData.currencySymbol }}</p>
          </div>
          <div class="p-3 border rounded-lg bg-red-50 text-center">
            <span class="text-xs font-semibold text-red-600 uppercase">Opex Y1</span>
            <p class="text-2xl font-bold text-red-700">{{ (totalOpexY1 || 0).toLocaleString(getLocale()) }} {{ formData.currencySymbol }}</p>
          </div>
          <div class="p-3 border rounded-lg bg-amber-50 text-center">
            <span class="text-xs font-semibold text-amber-600 uppercase">Shareholders</span>
            <p class="text-2xl font-bold text-amber-700">{{ totalShareholders }}</p>
          </div>
        </div>

        <div v-if="financing.longTermLoan || financing.shareCapitalIncrease" class="p-3 border rounded-lg bg-indigo-50">
          <span class="text-xs font-semibold text-indigo-600 uppercase">Financing</span>
          <p class="text-sm mt-1">
            <span v-if="financing.shareCapitalIncrease">Capital: {{ financing.shareCapitalIncrease?.toLocaleString(getLocale()) }} {{ formData.currencySymbol }}</span>
            <span v-if="financing.shareCapitalIncrease && financing.longTermLoan"> · </span>
            <span v-if="financing.longTermLoan">Loan: {{ financing.longTermLoan?.toLocaleString(getLocale()) }} {{ formData.currencySymbol }} ({{ financing.loanTermYears }}y @ {{ financing.loanInterestRate }}%)</span>
          </p>
        </div>
      </div>

      </template>
    </Card>

    <!-- Navigation Buttons -->
    <div class="flex items-center justify-between">
      <Button
        label="Previous"
        icon="pi pi-arrow-left"
        @click="prevStep"
        :disabled="currentStep === 0"
        severity="secondary"
      />

      <span class="text-sm text-gray-600">
        Step {{ currentStep + 1 }} of {{ steps.length }}
      </span>

      <div class="flex gap-3">
        <Button
          v-if="currentStep < steps.length - 1"
          label="Next"
          icon="pi pi-arrow-right"
          @click="nextStep"
          iconPos="right"
        />
        <Button
          v-else
          label="Create Plan"
          icon="pi pi-check"
          @click="finishWizard"
          :loading="isLoading"
          severity="success"
        />
      </div>
    </div>
  </div>
</template>
