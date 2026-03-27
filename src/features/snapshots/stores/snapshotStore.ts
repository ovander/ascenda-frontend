import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Snapshot, SnapshotDiff, FullPlanOutput } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const useSnapshotStore = defineStore('snapshots', () => {
  const snapshots = ref<Snapshot[]>([])
  const snapshotData = ref<FullPlanOutput | null>(null)
  const diffResult = ref<SnapshotDiff | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/snapshots`
  }

  async function fetchSnapshots() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<any>(`${basePath()}/`)
      const body = response.data
      // Backend may return a PagedResponse { data: Snapshot[], total, page, limit }
      // or a plain Snapshot[] — handle both defensively.
      const items: Snapshot[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : []
      snapshots.value = items
      return items
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch snapshots'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createSnapshot(payload: {
    label: string
    description: string
    reason: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post<Snapshot>(`${basePath()}/`, payload)
      snapshots.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create snapshot'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchSnapshotData(snapshotId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<FullPlanOutput>(`${basePath()}/${snapshotId}/data`)
      snapshotData.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch snapshot data'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`${basePath()}/${snapshotId}/restore`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to restore snapshot'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function cloneSnapshot(snapshotId: string, payload: { newLabel: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post<Snapshot>(
        `${basePath()}/${snapshotId}/clone`,
        payload
      )
      snapshots.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to clone snapshot'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSnapshot(snapshotId: string) {
    loading.value = true
    error.value = null
    try {
      await api.delete(`${basePath()}/${snapshotId}`)
      snapshots.value = snapshots.value.filter((s) => s.id !== snapshotId)
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete snapshot'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function diffSnapshots(snapshotId1: string, snapshotId2: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<SnapshotDiff>(
        `${basePath()}/${snapshotId1}/diff/${snapshotId2}`
      )
      diffResult.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to compare snapshots'
      throw err
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    snapshots.value = []
    snapshotData.value = null
    diffResult.value = null
    error.value = null
  }

  return {
    snapshots,
    snapshotData,
    diffResult,
    loading,
    error,
    fetchSnapshots,
    createSnapshot,
    fetchSnapshotData,
    restoreSnapshot,
    cloneSnapshot,
    deleteSnapshot,
    diffSnapshots,
    $reset,
  }
})
