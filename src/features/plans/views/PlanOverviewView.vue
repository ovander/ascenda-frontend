<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import { devlog } from '@/utils/logger'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useAuth } from '@/composables/useAuth'
import { useTierGate } from '@/composables/useTierGate'
import { useToast } from 'primevue/usetoast'
import PlanMembersPanel from '../components/PlanMembersPanel.vue'
import SafeDeleteModal from '@/components/SafeDeleteModal.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'

const props = defineProps<{ planId: string }>()
const { t, locale } = useI18n()
const router = useRouter()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { isOwner } = useAuth()
const { isFreemium, isEnterprise, showUpgradeModal } = useTierGate()
const uiStore = useUiStore()
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

/** Open the new-scenario dialog only when the user hasn't hit their tier limit. */
function requestNewScenario() {
  const count = scenarioStore.scenarios.length
  if (isFreemium.value && count >= 1) {
    showUpgradeModal('Additional Scenarios', 'pro')
    return
  }
  if (!isEnterprise.value && !isFreemium.value && count >= 3) {
    showUpgradeModal('Additional Scenarios', 'enterprise')
    return
  }
  showNewDialog.value = true
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
    case 'draft':    return t('enums.planStatus.draft')
    case 'review':   return t('messages.statusInReview')
    case 'approved': return t('messages.statusApprovedLocked')
    case 'archived': return t('enums.planStatus.archived')
    default:         return status || t('enums.planStatus.draft')
  }
}

// ── Lifecycle transitions (owner only) ───────────────────────────────────────

const lifecycleLoading = ref(false)

async function lockPlan() {
  lifecycleLoading.value = true
  try {
    await planStore.lockPlan(props.planId)
    toast.add({ severity: 'success', summary: t('messages.planLocked'), detail: t('messages.planLockedDetail'), life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('messages.error'), detail: err.response?.data?.error?.message || t('messages.failedLockPlan'), life: 5000 })
  } finally {
    lifecycleLoading.value = false
  }
}

async function unlockPlan() {
  lifecycleLoading.value = true
  try {
    await planStore.unlockPlan(props.planId)
    toast.add({ severity: 'success', summary: t('messages.planUnlocked'), detail: t('messages.planUnlockedDetail'), life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('messages.error'), detail: err.response?.data?.error?.message || t('messages.failedUnlockPlan'), life: 5000 })
  } finally {
    lifecycleLoading.value = false
  }
}

async function archivePlan() {
  lifecycleLoading.value = true
  try {
    await planStore.archivePlan(props.planId)
    toast.add({ severity: 'info', summary: t('messages.archived'), detail: t('messages.planArchivedDetail'), life: 3000 })
    router.push('/plans')
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('messages.error'), detail: err.response?.data?.error?.message || t('messages.failedArchivePlan'), life: 5000 })
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
  if (impact.isDefault) lines.push(t('messages.thisIsDefault'))
  if (impact.isLastInPlan) lines.push(t('messages.lastScenario'))
  return lines
}

async function confirmDeleteScenario() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await scenarioStore.deleteScenario(props.planId, deleteTarget.value.id)
    showDeleteModal.value = false
    toast.add({ severity: 'success', summary: t('messages.deleted'), detail: t('messages.scenarioDeleted'), life: 3000 })
    deleteTarget.value = null
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('messages.error'), detail: err.response?.data?.error?.message || t('messages.failedDeleteScenario'), life: 5000 })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <Toast />
    <PageContainer>
      <PageHeader>
        <template #title>{{ planStore.activePlan?.name || 'Plan' }}</template>
        <template #subtitle>{{ planStore.activePlan?.description }}</template>
        <template #actions>
          <div class="flex items-center gap-2">
            <Tag
              :value="statusLabel(planStore.activePlan?.status)"
              :severity="statusSeverity(planStore.activePlan?.status)"
            />

            <!-- Lifecycle buttons + New Scenario — owner only, tablet+ only -->
            <template v-if="isOwner && !uiStore.isMobile">
              <Button
                v-if="(planStore.activePlan?.status as any) === 'review'"
                :label="t('messages.lockPlan')"
                icon="pi pi-lock"
                severity="warn"
                size="small"
                :loading="lifecycleLoading"
                :v-tooltip="t('messages.markAsApproved')"
                @click="lockPlan"
              />
              <Button
                v-if="(planStore.activePlan?.status as any) === 'approved'"
                :label="t('messages.unlock')"
                icon="pi pi-lock-open"
                severity="secondary"
                size="small"
                :loading="lifecycleLoading"
                :v-tooltip="t('messages.moveBackReview')"
                @click="unlockPlan"
              />
              <Button
                v-if="['draft', 'review', 'approved'].includes(planStore.activePlan?.status ?? '')"
                :label="t('messages.archive')"
                icon="pi pi-inbox"
                severity="secondary"
                text
                size="small"
                :loading="lifecycleLoading"
                :v-tooltip="t('messages.archiveThisPlan')"
                @click="archivePlan"
              />
            </template>

            <Button v-if="!uiStore.isMobile" :label="t('messages.newScenario')" icon="pi pi-plus" @click="requestNewScenario" />
          </div>
        </template>
      </PageHeader>

    <Card>
      <template #title>{{ t('messages.scenarios') }}</template>
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

          <!-- Name — always visible; shows Base tag inline on mobile -->
          <Column field="name" header="Name" sortable class="font-medium">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <span>{{ data.name }}</span>
                <Tag v-if="data.isBase" value="Base" severity="info" class="text-xs" />
              </div>
            </template>
          </Column>

          <!-- Tablet+ only columns -->
          <Column v-if="!uiStore.isMobile" field="description" header="Description" />
          <Column v-if="!uiStore.isMobile" field="updatedAt" header="Last Updated" sortable style="width: 160px">
            <template #body="{ data }">
              {{ new Date(data.updatedAt).toLocaleDateString(locale) }}
            </template>
          </Column>

          <!-- Actions: open always; clone + delete tablet+ only -->
          <Column header="" :style="uiStore.isMobile ? 'width: 56px' : 'width: 120px'">
            <template #body="{ data }">
              <div class="flex gap-1">
                <template v-if="!uiStore.isMobile">
                  <Button
                    icon="pi pi-copy"
                    text
                    severity="secondary"
                    v-tooltip="'Clone'"
                    @click.stop="cloneScenarioAction(data.id)"
                  />
                </template>
                <Button
                  icon="pi pi-arrow-right"
                  text
                  severity="primary"
                  @click.stop="openScenario(data)"
                />
                <template v-if="!uiStore.isMobile">
                  <Button
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    v-tooltip="'Delete'"
                    @click.stop="deleteScenarioAction(data.id, data.name)"
                  />
                </template>
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
    <ResponsiveDialog v-model:visible="showNewDialog" :header="t('messages.newScenario')" size="sm" modal>
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('messages.nameLabel') }}</label>
          <InputText
            v-model="newScenario.name"
            class="w-full"
            placeholder="e.g. Base Case, Optimistic..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('messages.descriptionLabel') }}</label>
          <Textarea v-model="newScenario.description" class="w-full" rows="3" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text severity="secondary" @click="showNewDialog = false" />
        <Button
          :label="t('common.create')"
          icon="pi pi-check"
          @click="createScenario"
          :disabled="!newScenario.name"
        />
      </template>
    </ResponsiveDialog>

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
    </PageContainer>
  </div>
</template>
