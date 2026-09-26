<script setup lang="ts">
import { onMounted, ref, computed, nextTick, watch } from 'vue'
import { devlog } from '@/utils/logger'
import type { Product, DriverType, DriverParams } from '@/types'
import { useProductStore } from '@/features/products/stores/productStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDecimal } from '@/composables/useDecimal'
import { useYearHeaders } from '@/composables/useYearHeaders'
import ProductDetailPanel from '../components/ProductDetailPanel.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { usePlanAccess } from '@/composables/usePlanAccess'
import { useTierGate } from '@/composables/useTierGate'
import KFieldLabel from '@/components/common/KFieldLabel.vue'

defineProps<{ planId?: string; sid?: string }>()
const { canEdit } = usePlanAccess()
const { isPro, showUpgradeModal } = useTierGate()

/** All drivers except 'generic' are Pro-tier features. */
function isDriverLocked(dt: DriverType): boolean {
  return !isPro.value && dt !== 'generic'
}

const productStore = useProductStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { formatPercent, getLocale, getUnitLabel, formatUnit } = useDecimal()
const { yearHeaders } = useYearHeaders()

// 'Days' when every product in the scenario is a service; 'Units' otherwise
const consolidatedVolumeLabel = computed(() => {
  const products = productStore.products
  if (!products.length) return 'Units'
  const allServices = products.every((p) => p.productType === 'service')
  const allProducts = products.every((p) => p.productType !== 'service')
  if (allServices) return 'Days'
  if (allProducts) return 'Units'
  return 'Volume' // mixed
})

const showAddDialog = ref(false)
const expandedRows = ref<Set<string>>(new Set())

// ── Driver type = the sole product classifier ─────────────────────────────
// 'consulting' maps to productType 'service' (billable days).
// All other drivers map to productType 'product'.
const driverTypeOptions: {
  label: string
  value: DriverType
  icon: string
  description: string
}[] = [
  {
    value: 'generic',
    label: 'Generic',
    icon: '📋',
    description: 'Enter volumes and unit costs manually — use for any product or service that doesn\'t fit a structured driver.',
  },
  {
    value: 'consulting',
    label: 'Consulting / Service',
    icon: '🤝',
    description: 'Billable days = Headcount × Working Days × Utilisation. Cost per day derived from salaries.',
  },
  {
    value: 'saas',
    label: 'SaaS / Subscription',
    icon: '☁️',
    description: 'Revenue = Active Users × Monthly Fee × 12. Cost = (Infra + Support) per user × 12.',
  },
  {
    value: 'industry',
    label: 'Manufacturing / Industry',
    icon: '🏭',
    description: 'Uses your sales-volume forecast. Driver adjusts unit cost for scrap rate and setup amortisation.',
  },
  {
    value: 'marketplace',
    label: 'Marketplace / Platform',
    icon: '🛒',
    description: 'Net revenue = GMV × Take Rate. Cost = Payment processing + Fixed infra amortised per transaction.',
  },
  {
    value: 'media',
    label: 'Media / Advertising',
    icon: '📺',
    description: 'Revenue per mille = CPM × Fill Rate. Cost = Delivery cost + Content cost amortised over impressions.',
  },
  {
    value: 'session_based',
    label: 'Training / Events',
    icon: '🎓',
    description: 'Revenue = Sessions × Participants × Fill Rate × Price/participant. Cost split between fixed per-session (trainer, venue) and variable per-participant.',
  },
  {
    value: 'competition',
    label: 'Competition / Prize Money',
    icon: '🏆',
    description: 'Prize money = Wins, Top 10s and Cuts × the tour\'s prize per result (Europe and US tour presets). Costs: entry, travel and caddie per event, coach per year, both caddie and coach plus a share of winnings.',
  },
  {
    value: 'contract',
    label: 'Sponsorship / Contracts',
    icon: '✍️',
    description: 'Revenue = contract values per year + a bonus per win on active contracts. Wins come from the Competition products of the scenario.',
  },
]

/** Derive the backend productType from the chosen driver. */
function productTypeFromDriver(dt: DriverType): 'service' | 'product' {
  return dt === 'consulting' || dt === 'session_based' || dt === 'competition' || dt === 'contract'
    ? 'service'
    : 'product'
}

const newProductDriverParams = ref<DriverParams>(null)

const newProductForm = ref<Record<string, any>>({
  name: '',
  driverType: 'generic' as DriverType,
})

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    try {
      await productStore.fetchProducts()
      // Only fetch consolidated if there are products
      if (productStore.products.length > 0) {
        await productStore.fetchConsolidated()
      }
    } catch {
      // Errors are already stored in productStore.error
    }
  }
})

// Watch for scenario changes and refresh products/consolidated revenue
watch(
  () => scenarioStore.activeScenario?.id,
  async (newScenarioId) => {
    if (newScenarioId && planStore.activePlan) {
      productStore.$reset()
      try {
        await productStore.fetchProducts()
        if (productStore.products.length > 0) {
          await productStore.fetchConsolidated()
        }
      } catch {
        // Errors are already stored in productStore.error
      }
    }
  }
)

const safeCurrency = (v: any) => (v != null && v !== '') ? formatUnit(v) : '—'
const safePct      = (v: any) => (v != null && v !== '') ? formatPercent(v)  : '—'
const safeUnits    = (v: any) => {
  if (v == null || v === '') return '—'
  return Number(v).toLocaleString(getLocale(), { maximumFractionDigits: 0 })
}

// ── Trend helpers ────────────────────────────────────────────────────────────
type TrendDirection = 'up' | 'stable' | 'down'
interface Trend { direction: TrendDirection; pct: string }

function calcTrend(current: number, previous: number): Trend | null {
  if (previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return {
    direction: pct > 1 ? 'up' : pct < -1 ? 'down' : 'stable',
    pct: Math.abs(pct).toFixed(1),
  }
}

function trendIcon(d: TrendDirection) {
  return d === 'up' ? '↑' : d === 'down' ? '↓' : '→'
}

function trendClass(d: TrendDirection) {
  return d === 'up'
    ? 'trend-up'
    : d === 'down'
      ? 'trend-down'
      : 'trend-stable'
}

// ── Consolidated rows with trend badges ──────────────────────────────────────
const consolidatedDataWithTotal = computed(() => {
  const totals = productStore.consolidatedRevenue?.totals
  if (!totals?.length) return []

  let cumTurnover = 0, cumCogs = 0, cumGrossMargin = 0
  let cumDirect = 0, cumIndirect = 0, cumEurope = 0, cumUnits = 0
  let cumulative = 0

  const rows = totals.map((year, i) => {
    const prev = i > 0 ? totals[i - 1] : null
    cumulative += Number(year.totalUnitSales ?? 0)

    // Accumulate grand-total sums
    cumTurnover    += Number(year.totalTurnover     ?? 0)
    cumCogs        += Number(year.totalCogs         ?? 0)
    cumGrossMargin += Number(year.totalGrossMargin  ?? 0)
    cumDirect      += Number(year.totalDirectSales  ?? 0)
    cumIndirect    += Number(year.totalIndirectSales ?? 0)
    cumEurope      += Number(year.europeExportSales  ?? 0)
    cumUnits       += Number(year.totalUnitSales     ?? 0)

    return {
      yearIndex:           yearHeaders.value[year.year - 1] ?? year.year,
      totalTurnover:       safeCurrency(year.totalTurnover),
      totalCOGS:           safeCurrency(year.totalCogs),
      grossMargin:         safeCurrency(year.totalGrossMargin),
      grossMarginPct:      safePct(year.grossMarginPct),
      directSales:         safeCurrency(year.totalDirectSales),
      indirectSales:       safeCurrency(year.totalIndirectSales),
      europeExportSales:   safeCurrency(year.europeExportSales),
      totalUnitSales:      safeUnits(year.totalUnitSales),
      cumulativeUnitSales: safeUnits(cumulative),
      isTotal:             false,
      // Trend vs previous year (null for first year)
      trendTurnover:    prev ? calcTrend(Number(year.totalTurnover ?? 0),    Number(prev.totalTurnover ?? 0))    : null,
      trendMarginPct:   prev ? calcTrend(Number(year.grossMarginPct ?? 0),   Number(prev.grossMarginPct ?? 0))   : null,
      trendUnits:       prev ? calcTrend(Number(year.totalUnitSales ?? 0),   Number(prev.totalUnitSales ?? 0))   : null,
    }
  })

  const grossMarginPctTotal = cumTurnover > 0 ? cumGrossMargin / cumTurnover : 0

  const totalRow = {
    yearIndex:           'Grand Total',
    totalTurnover:       safeCurrency(cumTurnover),
    totalCOGS:           safeCurrency(cumCogs),
    grossMargin:         safeCurrency(cumGrossMargin),
    grossMarginPct:      safePct(grossMarginPctTotal),
    directSales:         safeCurrency(cumDirect),
    indirectSales:       safeCurrency(cumIndirect),
    europeExportSales:   safeCurrency(cumEurope),
    totalUnitSales:      safeUnits(cumUnits),
    cumulativeUnitSales: safeUnits(cumUnits),
    isTotal:             true,
    trendTurnover:       null as Trend | null,
    trendMarginPct:      null as Trend | null,
    trendUnits:          null as Trend | null,
  }

  return [...rows, totalRow]
})

async function handleAddProduct() {
  if (!newProductForm.value.name?.trim()) return
  try {
    const driverType: DriverType = newProductForm.value.driverType || 'generic'
    await productStore.createProduct({
      name: newProductForm.value.name,
      productType: productTypeFromDriver(driverType),
      driverType,
      driverParams: driverType !== 'generic' ? newProductDriverParams.value : null,
    })
    resetForm()
    showAddDialog.value = false
  } catch (err) {
    devlog.error('[products] failed to create product', err)
  }
}

function resetForm() {
  newProductForm.value = {
    name: '',
    driverType: 'generic' as DriverType,
  }
  newProductDriverParams.value = null
}

async function handleDeleteProduct(productId: string) {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      await productStore.deleteProduct(productId)
      expandedRows.value.delete(productId)
    } catch (err) {
      devlog.error('[products] failed to delete product', err)
    }
  }
}

function toggleExpand(productId: string) {
  if (!productId) return  // guard: never expand a product without a server-assigned id
  if (expandedRows.value.has(productId)) {
    expandedRows.value.delete(productId)
  } else {
    expandedRows.value.add(productId)
  }
}

function isExpanded(productId: string): boolean {
  return expandedRows.value.has(productId)
}

// ── Inline product rename ────────────────────────────────────────────────────
const renamingId   = ref<string | null>(null)
const renameValue  = ref('')
// NOTE: ref="name" inside v-for produces an array in Vue 3.
// Use a function ref so we always get the single HTMLInputElement.
const renameInputRef = ref<HTMLInputElement | null>(null)
function setRenameRef(el: HTMLInputElement | null, productId: string) {
  if (productId === renamingId.value) renameInputRef.value = el
}

function startRename(product: Product) {
  if (!canEdit.value) return
  renamingId.value = product.id
  renameValue.value = product.name
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

async function commitRename(productId: string) {
  const trimmed = renameValue.value.trim()
  if (trimmed && trimmed !== productStore.products.find(p => p.id === productId)?.name) {
    try {
      await productStore.updateProduct(productId, { name: trimmed })
    } catch (err) {
      devlog.error('[products] rename failed', err)
    }
  }
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

// ── DEV: audit trail download ─────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const devAuditDownloading = ref(false)

async function downloadProductAudit() {
  devAuditDownloading.value = true
  try {
    const plan     = planStore.activePlan
    const scenario = scenarioStore.activeScenario

    // Collect per-product data, fetching anything not yet in the store
    const productAudits = await Promise.all(
      productStore.products.map(async (p) => {
        await Promise.allSettled([
          productStore.fetchAssumptions(p.id),
          productStore.fetchVolumes(p.id),
          productStore.fetchMargins(p.id),
        ])
        let revenue = null
        try { revenue = await productStore.fetchRevenueByProduct(p.id) } catch { /* ok */ }

        return {
          id:          p.id,
          name:        p.name,
          productType: p.productType ?? 'product',
          assumptions: productStore.getAssumptions(p.id),
          volumes:     productStore.getVolumes(p.id),
          margins:     productStore.getMargins(p.id),
          revenue,
        }
      })
    )

    const audit = {
      _meta: {
        exportedAt:  new Date().toISOString(),
        planId:      plan?.id,
        planName:    plan?.name,
        scenarioId:  scenario?.id,
        scenarioName: scenario?.name,
        note:        'All financial values in k€. Unit prices and COGS in base €.',
      },
      products: productAudits,
      consolidatedRevenue: productStore.consolidatedRevenue,
    }

    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `product-audit-${scenario?.id?.slice(0, 8) ?? 'unknown'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } finally {
    devAuditDownloading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Products / Services</h1>
      <div class="flex items-center gap-2">
        <!-- DEV ONLY: download full product audit trail as JSON -->
        <button
          v-if="isDev"
          :disabled="devAuditDownloading"
          class="dev-btn"
          @click="downloadProductAudit"
        >
          <span class="dev-badge">DEV</span>
          {{ devAuditDownloading ? 'Collecting…' : '⬇ Download Product Audit' }}
        </button>
        <Button
          v-if="canEdit"
          icon="pi pi-plus"
          label="Add Product / Service"
          @click="showAddDialog = true"
          class="p-button-sm"
        />
      </div>
    </div>

    <!-- Add Product Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add New Product / Service"
      :modal="true"
      :style="{ width: '50vw' }"
      @hide="resetForm"
    >
      <div class="space-y-5">
        <div>
          <KFieldLabel
            label="Name"
            tooltip="Unique name for this product or service line. Used as a label in all revenue tables, reports, and charts."
          />
          <InputText
            v-model="newProductForm.name"
            class="w-full"
            placeholder="Enter product or service name"
            autofocus
          />
        </div>

        <!-- Business Driver: the sole type selector -->
        <div>
          <KFieldLabel
            label="Business Driver"
            tooltip="Pick the model that best describes how this product generates revenue. The driver sets up the volume and unit-economics logic automatically. Use Generic to enter everything manually."
          />
          <div class="driver-cards mt-1">
            <label
              v-for="opt in driverTypeOptions"
              :key="opt.value"
              class="driver-card"
              :class="{
                'driver-card--selected': newProductForm.driverType === opt.value,
                'driver-card--locked':   isDriverLocked(opt.value),
              }"
              @click="isDriverLocked(opt.value) && showUpgradeModal('Business Drivers', 'pro')"
            >
              <input
                type="radio"
                :value="opt.value"
                v-model="newProductForm.driverType"
                :disabled="isDriverLocked(opt.value)"
                class="sr-only"
              />
              <span class="driver-card__icon">{{ opt.icon }}</span>
              <span class="driver-card__label">
                {{ opt.label }}
                <span v-if="isDriverLocked(opt.value)" class="driver-card__pro-badge">PRO</span>
              </span>
              <span class="driver-card__desc">{{ opt.description }}</span>
            </label>
          </div>
          <p v-if="newProductForm.driverType !== 'generic'" class="mt-2 text-xs text-blue-600">
            Configure driver parameters after creation in the product's <strong>Driver Config</strong> tab.
          </p>
        </div>

      </div><!-- end space-y-5 -->

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          @click="showAddDialog = false"
          class="p-button-text"
        />
        <Button
          label="Create"
          icon="pi pi-check"
          @click="handleAddProduct"
          autofocus
        />
      </template>
    </Dialog>

    <!-- Products List -->
    <div v-if="productStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else class="space-y-4">
      <div v-if="productStore.products.length === 0" class="text-center text-gray-500 py-8">
        <i class="pi pi-box text-4xl mb-3 text-gray-300"></i>
        <p>No products or services yet. Click "Add Product / Service" to create one.</p>
      </div>

      <!-- Product cards with expandable detail panels -->
      <div v-for="product in productStore.products" :key="product.id" class="border rounded-lg bg-white">
        <!-- Product header row -->
        <div class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" @click="toggleExpand(product.id)">
          <Button
            :icon="isExpanded(product.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            text
            size="small"
            @click.stop="toggleExpand(product.id)"
          />
          <!-- Inline rename: double-click to edit, Enter/blur to save, Escape to cancel -->
          <input
            v-if="renamingId === product.id"
            :ref="(el) => setRenameRef(el as HTMLInputElement | null, product.id)"
            v-model="renameValue"
            class="font-medium flex-1 border-b border-blue-400 bg-transparent outline-hidden px-0"
            @click.stop
            @keydown.enter.prevent="commitRename(product.id)"
            @keydown.escape.prevent="cancelRename"
            @blur="commitRename(product.id)"
          />
          <span
            v-else
            class="font-medium flex-1 cursor-text"
            :title="canEdit ? 'Double-click to rename' : undefined"
            @dblclick.stop="startRename(product)"
          >{{ product.name || '(unnamed)' }}</span>
          <!-- Driver badge — always shown, identifies the business model -->
          <span
            class="text-xs rounded-sm px-2 py-0.5 font-medium border"
            :class="product.driverType && product.driverType !== 'generic'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'"
          >
            {{ driverTypeOptions.find(d => d.value === (product.driverType || 'generic'))?.icon }}
            {{ driverTypeOptions.find(d => d.value === (product.driverType || 'generic'))?.label ?? 'Generic' }}
          </span>
          <Button
            v-if="canEdit"
            icon="pi pi-trash"
            text
            severity="danger"
            size="small"
            @click.stop="handleDeleteProduct(product.id)"
          />
        </div>

        <!-- Expanded detail panel — only render once we have a real server id -->
        <div v-if="isExpanded(product.id) && !!product.id" class="border-t px-4 py-4 bg-gray-50">
          <ProductDetailPanel :productId="product.id" />
        </div>
      </div>
    </div>

    <!-- Consolidated Revenue Summary -->
    <div v-if="consolidatedDataWithTotal.length > 0" class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">Consolidated Revenue Summary</h2>
        <span class="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-sm px-2 py-0.5 font-medium">
          Amounts in {{ getUnitLabel() }}
        </span>
      </div>
      <DataTable
        :value="consolidatedDataWithTotal"
        :row-class="(row: any) => row.isTotal ? 'row-grand-total' : ''"
        class="p-datatable-sm p-datatable-gridlines"
        :scrollable="true"
        scrollHeight="flex"
        showGridlines
        size="small"
      >
        <Column field="yearIndex" header="Year" />

        <!-- Total Turnover + trend -->
        <Column field="totalTurnover" header="Total Turnover" class="text-right">
          <template #body="{ data }">
            <div class="cell-with-trend">
              <span>{{ data.totalTurnover }}</span>
              <span v-if="data.trendTurnover" :class="trendClass(data.trendTurnover.direction)" class="trend-badge">
                {{ trendIcon(data.trendTurnover.direction) }}&nbsp;{{ data.trendTurnover.pct }}&nbsp;%
              </span>
            </div>
          </template>
        </Column>

        <Column field="totalCOGS" header="Total COGS" class="text-right" />
        <Column field="grossMargin" header="Gross Margin" class="text-right" />

        <!-- Gross Margin % + trend -->
        <Column field="grossMarginPct" header="Gross Margin %" class="text-right">
          <template #body="{ data }">
            <div class="cell-with-trend">
              <span>{{ data.grossMarginPct }}</span>
              <span v-if="data.trendMarginPct" :class="trendClass(data.trendMarginPct.direction)" class="trend-badge">
                {{ trendIcon(data.trendMarginPct.direction) }}&nbsp;{{ data.trendMarginPct.pct }}&nbsp;%
              </span>
            </div>
          </template>
        </Column>

        <Column field="directSales" header="Direct Sales" class="text-right" />
        <Column field="indirectSales" header="Indirect Sales" class="text-right" />
        <Column field="europeExportSales" header="Europe/Export Sales" class="text-right" />

        <!-- Total Days/Units + trend -->
        <Column field="totalUnitSales" :header="`Total ${consolidatedVolumeLabel}`" class="text-right">
          <template #body="{ data }">
            <div class="cell-with-trend">
              <span>{{ data.totalUnitSales }}</span>
              <span v-if="data.trendUnits" :class="trendClass(data.trendUnits.direction)" class="trend-badge">
                {{ trendIcon(data.trendUnits.direction) }}&nbsp;{{ data.trendUnits.pct }}&nbsp;%
              </span>
            </div>
          </template>
        </Column>

        <Column field="cumulativeUnitSales" :header="`Cumul. ${consolidatedVolumeLabel}`" class="text-right" />
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-datatable) {
  font-size: 0.875rem;
}

:deep(.p-datatable-gridlines > .p-datatable-tbody > tr > td) {
  border-color: #e5e7eb;
}

:deep(.row-grand-total > td) {
  font-weight: 700;
  background-color: #eff6ff;
  border-top: 2px solid #3b82f6 !important;
  color: #1e3a5f;
}

/* ── Trend indicators ──────────────────────────────────────────────────────── */
:deep(.cell-with-trend) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

:deep(.trend-badge) {
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

:deep(.trend-up) {
  color: #15803d;
  background-color: #dcfce7;
}

:deep(.trend-down) {
  color: #b91c1c;
  background-color: #fee2e2;
}

:deep(.trend-stable) {
  color: #6b7280;
  background-color: #f3f4f6;
}

/* ── DEV button ────────────────────────────────────────────────────────────── */
.dev-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  background: #fffbeb;
  border: 1.5px dashed #f59e0b;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.dev-btn:hover:not(:disabled) { background: #fef3c7; }
.dev-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.dev-badge {
  padding: 0 0.3rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  background: #f59e0b;
  border-radius: 3px;
}

/* ── Driver card selector ─────────────────────────────────────────────────── */
.driver-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.driver-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #fff;
}

.driver-card:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.driver-card--selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.driver-card--locked {
  opacity: 0.58;
  cursor: default;
}

.driver-card--locked:hover {
  border-color: #e5e7eb;
  background: #fff;
}

.driver-card__pro-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.3rem;
  padding: 0.05rem 0.38rem;
  border-radius: 9999px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: #fef3c7;
  color: #b45309;
  vertical-align: middle;
  line-height: 1.5;
}

.driver-card__icon {
  font-size: 1.25rem;
  line-height: 1;
}

.driver-card__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e3a5f;
}

.driver-card--selected .driver-card__label {
  color: #1d4ed8;
}

.driver-card__desc {
  font-size: 0.72rem;
  color: #6b7280;
  line-height: 1.35;
}

</style>
