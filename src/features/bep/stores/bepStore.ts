import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  BEPSnapshot,
  FixedCostLine,
  VariableCostLine,
  SensitivityConfig,
  OptimisationPlan,
  FixedCostSaving,
  VariableCostSaving,
  PCGAccount,
  PCGReviewItem,
  BEPReport,
  OptimisedBEPReport,
  BEPSensitivityType,
} from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

// Returned by GET /bep/plan-preview?year=N — read-only, never written to DB.
export interface BEPPlanPreview {
  fixedCostsTotal: string
  contributionMarginPct: string
  avgOrderValue?: string
  yearIndex: number
}

// ── Multi-year BEP types ───────────────────────────────────────────────────
// Returned by GET /bep/multi-year-report — derived from plan, no snapshot needed.

export interface MultiYearBEPRow {
  year: number
  fixedCosts: string
  revenue: string
  contributionMarginPct: string
  bepRevenue: string | null
  bepRevenueUndefined: boolean
  revenueAboveBep: boolean
  annualEbe: string
  cumulativeEbe: string
  isFirstAnnualBep: boolean
  isCumulativeBepCrossover: boolean
}

export interface MultiYearBEPReport {
  years: MultiYearBEPRow[]
  firstProfitableYear: number | null
  cumulativeBepYear: number | null
  cumulativeBepMonth: number | null
  totalCumulativeEbe: string
}

export const useBEPStore = defineStore('bep', () => {
  // ── State ──────────────────────────────────────────────────────
  const snapshots = ref<BEPSnapshot[]>([])
  const activeSnapshot = ref<BEPSnapshot | null>(null)
  const fixedCostLines = ref<FixedCostLine[]>([])
  const variableCostLines = ref<VariableCostLine[]>([])
  const sensitivityConfigs = ref<SensitivityConfig[]>([])
  const report = ref<BEPReport | null>(null)

  const plans = ref<OptimisationPlan[]>([])
  const activePlan = ref<OptimisationPlan | null>(null)
  const fixedSavings = ref<FixedCostSaving[]>([])
  const variableSavings = ref<VariableCostSaving[]>([])
  const pcgReviewItems = ref<PCGReviewItem[]>([])
  const pcgAccounts = ref<PCGAccount[]>([])
  const optimisedReport = ref<OptimisedBEPReport | null>(null)
  const multiYearReport = ref<MultiYearBEPReport | null>(null)

  const loading = ref(false)
  const reportLoading = ref(false)
  const multiYearLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Base path helpers ──────────────────────────────────────────
  function scenarioBase(): string {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/bep`
  }

  function snapshotBase(snapshotId: string): string {
    return `${scenarioBase()}/snapshots/${snapshotId}`
  }

  // ── PCG reference data ─────────────────────────────────────────
  async function fetchPCGAccounts() {
    if (pcgAccounts.value.length > 0) return
    try {
      const res = await api.get<PCGAccount[]>(`${scenarioBase()}/pcg-accounts`)
      pcgAccounts.value = res.data
    } catch { /* non-fatal */ }
  }

  // ── Snapshots ─────────────────────────────────────────────────
  async function fetchSnapshots() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<BEPSnapshot[]>(`${scenarioBase()}/snapshots`)
      snapshots.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to load snapshots'
    } finally {
      loading.value = false
    }
  }

  async function selectSnapshot(id: string) {
    const found = snapshots.value.find(s => s.id === id)
    if (found) activeSnapshot.value = found
    await Promise.all([
      fetchFixedCostLines(id),
      fetchVariableCostLines(id),
      fetchSensitivityConfigs(id),
      fetchOptimisationPlans(id),
    ])
  }

  async function createSnapshot(data: Partial<BEPSnapshot>): Promise<BEPSnapshot | null> {
    try {
      const res = await api.post<BEPSnapshot>(`${scenarioBase()}/snapshots`, data)
      await fetchSnapshots()
      return res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to create snapshot'
      return null
    }
  }

  async function updateSnapshot(id: string, data: Partial<BEPSnapshot>): Promise<boolean> {
    try {
      const res = await api.put<BEPSnapshot>(`${snapshotBase(id)}`, data)
      activeSnapshot.value = res.data
      await fetchSnapshots()
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to update snapshot'
      return false
    }
  }

  async function deleteSnapshot(id: string): Promise<boolean> {
    try {
      await api.delete(`${snapshotBase(id)}`)
      if (activeSnapshot.value?.id === id) {
        activeSnapshot.value = null
        report.value = null
      }
      await fetchSnapshots()
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to delete snapshot'
      return false
    }
  }

  // ── Plan preview (read-only, pre-populates the creation form) ─
  async function previewFromPlan(year: number): Promise<BEPPlanPreview | null> {
    try {
      const res = await api.get<BEPPlanPreview>(`${scenarioBase()}/plan-preview?year=${year}`)
      return res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to load plan preview'
      return null
    }
  }

  // ── Plan import ───────────────────────────────────────────────
  async function importFromPlan(snapshotId: string, year: number): Promise<boolean> {
    try {
      const res = await api.post<BEPSnapshot>(
        `${snapshotBase(snapshotId)}/import-from-plan?year=${year}`
      )
      activeSnapshot.value = res.data
      // Refresh the snapshots list so the selector shows the updated label/source.
      await fetchSnapshots()
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to import from plan'
      return false
    }
  }

  // ── BEP Report ────────────────────────────────────────────────
  async function fetchReport(snapshotId: string) {
    reportLoading.value = true
    error.value = null
    try {
      const res = await api.get<BEPReport>(`${snapshotBase(snapshotId)}/report`)
      report.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to compute BEP report'
    } finally {
      reportLoading.value = false
    }
  }

  // ── Fixed cost lines ──────────────────────────────────────────
  async function fetchFixedCostLines(snapshotId: string) {
    try {
      const res = await api.get<FixedCostLine[]>(`${snapshotBase(snapshotId)}/fixed-costs`)
      fixedCostLines.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to load fixed costs'
    }
  }

  async function upsertFixedCostLines(snapshotId: string, lines: FixedCostLine[]): Promise<boolean> {
    try {
      await api.put(`${snapshotBase(snapshotId)}/fixed-costs`, lines)
      await fetchFixedCostLines(snapshotId)
      report.value = null // invalidate
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save fixed costs'
      return false
    }
  }

  // ── Variable cost lines ───────────────────────────────────────
  async function fetchVariableCostLines(snapshotId: string) {
    try {
      const res = await api.get<VariableCostLine[]>(`${snapshotBase(snapshotId)}/variable-costs`)
      variableCostLines.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to load variable costs'
    }
  }

  async function upsertVariableCostLines(snapshotId: string, lines: VariableCostLine[]): Promise<boolean> {
    try {
      await api.put(`${snapshotBase(snapshotId)}/variable-costs`, lines)
      await fetchVariableCostLines(snapshotId)
      report.value = null
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save variable costs'
      return false
    }
  }

  // ── Sensitivity configs ───────────────────────────────────────
  async function fetchSensitivityConfigs(snapshotId: string) {
    try {
      const res = await api.get<SensitivityConfig[]>(`${snapshotBase(snapshotId)}/sensitivity-config`)
      sensitivityConfigs.value = res.data
    } catch { /* non-fatal */ }
  }

  async function upsertSensitivityConfig(
    snapshotId: string,
    analysisType: BEPSensitivityType,
    data: { stepSizePct: string; rangePct: string }
  ): Promise<boolean> {
    try {
      await api.put(`${snapshotBase(snapshotId)}/sensitivity-config/${analysisType}`, data)
      await fetchSensitivityConfigs(snapshotId)
      report.value = null
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save sensitivity config'
      return false
    }
  }

  // ── Optimisation Plans ────────────────────────────────────────
  async function fetchOptimisationPlans(snapshotId: string) {
    try {
      const res = await api.get<OptimisationPlan[]>(`${snapshotBase(snapshotId)}/plans`)
      plans.value = res.data
    } catch { /* non-fatal */ }
  }

  async function createOptimisationPlan(snapshotId: string, data: { name: string; notes?: string }): Promise<OptimisationPlan | null> {
    try {
      const res = await api.post<OptimisationPlan>(`${snapshotBase(snapshotId)}/plans`, data)
      await fetchOptimisationPlans(snapshotId)
      return res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to create plan'
      return null
    }
  }

  async function selectPlan(snapshotId: string, planId: string) {
    const found = plans.value.find(p => p.id === planId)
    if (found) activePlan.value = found
    await Promise.all([
      fetchFixedSavings(planId),
      fetchVariableSavings(planId),
      fetchPCGReviewItems(planId),
    ])
  }

  async function deleteOptimisationPlan(snapshotId: string, planId: string): Promise<boolean> {
    try {
      await api.delete(`${snapshotBase(snapshotId)}/plans/${planId}`)
      if (activePlan.value?.id === planId) {
        activePlan.value = null
        optimisedReport.value = null
      }
      await fetchOptimisationPlans(snapshotId)
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to delete plan'
      return false
    }
  }

  // ── Optimised BEP Report ──────────────────────────────────────
  async function fetchOptimisedReport(snapshotId: string, planId: string) {
    reportLoading.value = true
    try {
      const res = await api.get<OptimisedBEPReport>(`${snapshotBase(snapshotId)}/plans/${planId}/report`)
      optimisedReport.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to compute optimised BEP'
    } finally {
      reportLoading.value = false
    }
  }

  // ── Savings ───────────────────────────────────────────────────
  async function fetchFixedSavings(planId: string) {
    const sid = activeSnapshot.value?.id
    if (!sid) return
    try {
      const res = await api.get<FixedCostSaving[]>(`${snapshotBase(sid)}/plans/${planId}/savings/fixed`)
      fixedSavings.value = res.data
    } catch { /* non-fatal */ }
  }

  async function upsertFixedSavings(planId: string, savings: FixedCostSaving[]): Promise<boolean> {
    const sid = activeSnapshot.value?.id
    if (!sid) return false
    try {
      await api.put(`${snapshotBase(sid)}/plans/${planId}/savings/fixed`, savings)
      await fetchFixedSavings(planId)
      optimisedReport.value = null
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save fixed savings'
      return false
    }
  }

  async function fetchVariableSavings(planId: string) {
    const sid = activeSnapshot.value?.id
    if (!sid) return
    try {
      const res = await api.get<VariableCostSaving[]>(`${snapshotBase(sid)}/plans/${planId}/savings/variable`)
      variableSavings.value = res.data
    } catch { /* non-fatal */ }
  }

  async function upsertVariableSavings(planId: string, savings: VariableCostSaving[]): Promise<boolean> {
    const sid = activeSnapshot.value?.id
    if (!sid) return false
    try {
      await api.put(`${snapshotBase(sid)}/plans/${planId}/savings/variable`, savings)
      await fetchVariableSavings(planId)
      optimisedReport.value = null
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save variable savings'
      return false
    }
  }

  async function fetchPCGReviewItems(planId: string) {
    const sid = activeSnapshot.value?.id
    if (!sid) return
    try {
      const res = await api.get<PCGReviewItem[]>(`${snapshotBase(sid)}/plans/${planId}/pcg-review`)
      pcgReviewItems.value = res.data
    } catch { /* non-fatal */ }
  }

  async function upsertPCGReviewItems(planId: string, items: PCGReviewItem[]): Promise<boolean> {
    const sid = activeSnapshot.value?.id
    if (!sid) return false
    try {
      await api.put(`${snapshotBase(sid)}/plans/${planId}/pcg-review`, items)
      await fetchPCGReviewItems(planId)
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to save PCG review'
      return false
    }
  }

  // ── Multi-year BEP report ──────────────────────────────────────
  async function fetchMultiYearReport(): Promise<void> {
    multiYearLoading.value = true
    error.value = null
    try {
      const res = await api.get<MultiYearBEPReport>(`${scenarioBase()}/multi-year-report`)
      multiYearReport.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to compute multi-year BEP'
    } finally {
      multiYearLoading.value = false
    }
  }

  function $reset() {
    snapshots.value = []
    activeSnapshot.value = null
    fixedCostLines.value = []
    variableCostLines.value = []
    sensitivityConfigs.value = []
    report.value = null
    plans.value = []
    activePlan.value = null
    fixedSavings.value = []
    variableSavings.value = []
    pcgReviewItems.value = []
    optimisedReport.value = null
    multiYearReport.value = null
    error.value = null
  }

  return {
    snapshots, activeSnapshot, fixedCostLines, variableCostLines,
    sensitivityConfigs, report, plans, activePlan, fixedSavings,
    variableSavings, pcgReviewItems, pcgAccounts, optimisedReport,
    multiYearReport,
    loading, reportLoading, multiYearLoading, error,
    fetchPCGAccounts,
    fetchSnapshots, selectSnapshot, createSnapshot, updateSnapshot, deleteSnapshot,
    previewFromPlan, importFromPlan,
    fetchReport,
    fetchFixedCostLines, upsertFixedCostLines,
    fetchVariableCostLines, upsertVariableCostLines,
    fetchSensitivityConfigs, upsertSensitivityConfig,
    fetchOptimisationPlans, createOptimisationPlan, selectPlan, deleteOptimisationPlan,
    fetchOptimisedReport,
    fetchFixedSavings, upsertFixedSavings,
    fetchVariableSavings, upsertVariableSavings,
    fetchPCGReviewItems, upsertPCGReviewItems,
    fetchMultiYearReport,
    $reset,
  }
})
