<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { devlog } from '@/utils/logger'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useAuth } from '@/composables/useAuth'
import { useToast } from 'primevue/usetoast'
import PlanMembersPanel from '../components/PlanMembersPanel.vue'
import SafeDeleteModal from '@/components/SafeDeleteModal.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'

const props = defineProps<{ planId: string }>()
const router = useRouter()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { isOwner } = useAuth()
const toast = useToast()

const showNewDialog = ref(false)
const newScenario = ref({ name: '', description: '' })

onMounted(async () => {
  try {
    await planStore.fetchPlan(props.planId)
    await scenarioStore.fetchScenarios(props.planId)
  } catch (err: any) {
    devlog.error('[plan] failed to load plan data', err?.response?.status, err?.response?.data)
  }
})

function openScenario(scenario: any) {
  scenarioStore.setActive(scenario)
  router.push(`/plans/${props.planId}/scenarios/${scenario.id}`)
}

async function createScenario() {
  const result = await scenarioStore.createScenario(props.planId, newScenario.value)
  showNewDialog.value = false
  newScenario.value = { name: '', description: '' }
  openScenario(result)
}

async function cloneScenarioAction(id: string) {
  await scenarioStore.cloneScenario(props.planId, id)
}

// ── Status badge helpers ──────────────────────────────────────────────────────

function statusSeverity(status: string | undefined): string {
  switch (status) {
    case 'draft':    return 'warn'
    case 'review':   return 'info'
    case 'approved': return 'danger'
    case 'archived': return 'secondary'
    default:         return 'secondary'
  }
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'draft':    return 'Draft'
    case 'review':   return 'In Review'
    case 'approved': return 'Approved / Locked'
    case 'archived': return 'Archived'
    default:         return status || 'Draft'
  }
}

// ── Lifecycle transitions (owner only) ───────────────────────────────────────

const lifecycleLoading = ref(false)

async function lockPlan() {
  lifecycleLoading.value = true
  try {
    await planStore.lockPlan(props.planId)
    toast.add({ severity: 'success', summary: 'Plan locked', detail: 'Plan is now approved and locked for investor sharing.', life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to lock plan', life: 5000 })
  } finally {
    lifecycleLoading.value = false
  }
}

async function unlockPlan() {
  lifecycleLoading.value = true
  try {
    await planStore.unlockPlan(props.planId)
    toast.add({ severity: 'success', summary: 'Plan unlocked', detail: 'Plan is back in review.', life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to unlock plan', life: 5000 })
  } finally {
    lifecycleLoading.value = false
  }
}

async function archivePlan() {
  lifecycleLoading.value = true
  try {
    await planStore.archivePlan(props.planId)
    toast.add({ severity: 'info', summary: 'Archived', detail: 'Plan has been archived.', life: 3000 })
    router.push('/plans')
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to archive plan', life: 5000 })
  } finally {
    lifecycleLoading.value = false
  }
}

// ── Scenario safe-delete ──────────────────────────────────────────────────────

interface ScenarioImpactResult {
  scenarioId: string
  scenarioName: string
  isDefault: boolean
  isLastInPlan: boolean
  canDelete: boolean
  blockedReason?: string
}

const showDeleteModal = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deleteImpact = ref<ScenarioImpactResult | null>(null)
const deleteLoading = ref(false)
const impactLoading = ref(false)

async function deleteScenarioAction(id: string, name: string) {
  deleteTarget.value = { id, name }
  deleteImpact.value = null
  showDeleteModal.value = true
  impactLoading.value = true
  try {
    deleteImpact.value = await planStore.getScenarioImpact(props.planId, id)
  } catch {
    // impact fetch failed — modal opens without impact preview
  } finally {
    impactLoading.value = false
  }
}

function scenarioImpactLines(impact: ScenarioImpactResult | null): string[] {
  if (!impact) return []
  const lines: string[] = []
  if (impact.isDefault) lines.push('This is the base / default scenario')
  if (impact.isLastInPlan) lines.push('Last remaining scenario in this plan')
  return lines
}

async function confirmDeleteScenario() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await scenarioStore.deleteScenario(props.planId, deleteTarget.value.id)
    showDeleteModal.value = false
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Scenario removed.', life: 3000 })
    deleteTarget.value = null
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to delete scenario', life: 5000 })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <Toast />

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ planStore.activePlan?.name || 'Plan' }}</h1>
        <p class="text-gray-500 mt-1">{{ planStore.activePlan?.description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Tag
          :value="statusLabel(planStore.activePlan?.status)"
          :severity="statusSeverity(planStore.activePlan?.status)"
        />

        <!-- Lifecycle buttons — owner only -->
        <template v-if="isOwner">
          <Button
            v-if="planStore.activePlan?.status === 'review'"
            label="Lock Plan"
            icon="pi pi-lock"
            severity="warn"
            size="small"
            :loading="lifecycleLoading"
            v-tooltip="'Mark as Approved — restricts further editing'"
            @click="lockPlan"
          />
          <Button
            v-if="planStore.activePlan?.status === 'approved'"
            label="Unlock"
            icon="pi pi-lock-open"
            severity="secondary"
            size="small"
            :loading="lifecycleLoading"
            v-tooltip="'Move back to In Review'"
            @click="unlockPlan"
          />
          <Button
            v-if="['draft', 'review', 'approved'].includes(planStore.activePlan?.status ?? '')"
            label="Archive"
            icon="pi pi-inbox"
            severity="secondary"
            text
            size="small"
            :loading="lifecycleLoading"
            v-tooltip="'Archive this plan'"
            @click="archivePlan"
          />
        </template>

        <Button label="New Scenario" icon="pi pi-plus" @click="showNewDialog = true" />
      </div>
    </div>

    <Card>
      <template #title>Scenarios</template>
      <template #content>
        <DataTable
          :value="scenarioStore.scenarios"
          :loading="scenarioStore.loading"
          stripedRows
          class="p-datatable-sm"
          @row-click="(e: any) => openScenario(e.data)"
          selectionMode="single"
          dataKey="id"
        >
          <template #empty>
            <div class="text-center py-8 text-gray-500">
              <p>No scenarios yet. Create your first scenario to start building your business plan.</p>
            </div>
          </template>
          <Column field="name" header="Name" sortable class="font-medium" />
          <Column field="description" header="Description" />
          <Column field="isBase" header="Base" style="width: 80px">
            <template #body="{ data }">
              <Tag v-if="data.isBase" value="Base" severity="info" />
            </template>
          </Column>
          <Column field="updatedAt" header="Last Updated" sortable style="width: 160px">
            <template #body="{ data }">
              {{ new Date(data.updatedAt).toLocaleDateString() }}
            </template>
          </Column>
          <Column header="Actions" style="width: 120px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-copy"
                  text
                  severity="secondary"
                  v-tooltip="'Clone'"
                  @click.stop="cloneScenarioAction(data.id)"
                />
                <Button
                  icon="pi pi-arrow-right"
                  text
                  severity="primary"
                  @click.stop="openScenario(data)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  severity="danger"
                  v-tooltip="'Delete'"
                  @click.stop="deleteScenarioAction(data.id, data.name)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Plan Members (owner only) -->
    <Card v-if="isOwner" class="mt-6">
      <template #content>
        <PlanMembersPanel :planId="props.planId" />
      </template>
    </Card>

    <!-- New Scenario Dialog -->
    <Dialog v-model:visible="showNewDialog" header="New Scenario" :style="{ width: '450px' }" modal>
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <InputText
            v-model="newScenario.name"
            class="w-full"
            placeholder="e.g. Base Case, Optimistic..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Textarea v-model="newScenario.description" class="w-full" rows="3" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showNewDialog = false" />
        <Button
          label="Create"
          icon="pi pi-check"
          @click="createScenario"
          :disabled="!newScenario.name"
        />
      </template>
    </Dialog>

    <!-- Scenario Safe Delete Modal -->
    <SafeDeleteModal
      v-model:visible="showDeleteModal"
      entity-type="Scenario"
      :entity-name="deleteTarget?.name ?? ''"
      :impact-lines="scenarioImpactLines(deleteImpact)"
      :blocked="deleteImpact?.canDelete === false"
      :blocked-reason="deleteImpact?.blockedReason"
      :loading="deleteLoading || impactLoading"
      @confirm="confirmDeleteScenario"
    />
  </div>
</template>
