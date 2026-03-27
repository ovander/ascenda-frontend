<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { PlanStatus } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Card from 'primevue/card'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'

const { t } = useI18n()
const router = useRouter()
const planStore = usePlanStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

onMounted(() => {
  planStore.fetchPlans()
})

const STATUS_OPTIONS = [
  { label: 'Draft',    value: 'draft' },
  { label: 'Review',   value: 'review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Archived', value: 'archived' },
]

function getStatusSeverity(status: string) {
  switch (status) {
    case 'draft':    return 'warn'
    case 'review':   return 'info'
    case 'approved': return 'success'
    case 'archived': return 'secondary'
    default:         return 'info'
  }
}

async function changeStatus(plan: any, newStatus: PlanStatus) {
  if (plan.status === newStatus) return
  try {
    await planStore.updatePlan(plan.id, { name: plan.name, description: plan.description, status: newStatus })
    toast.add({ severity: 'success', summary: 'Status updated', detail: `"${plan.name}" is now ${newStatus}.`, life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.', life: 4000 })
  }
}

function openPlan(plan: any) {
  planStore.setActive(plan)
  router.push(`/plans/${plan.id}`)
}

function confirmResetDemo() {
  confirm.require({
    message: 'This will delete all demo plans and re-create them with the latest data. Continue?',
    header: 'Reset demo plans',
    icon: 'pi pi-refresh',
    rejectLabel: 'Cancel',
    acceptLabel: 'Reset',
    accept: async () => {
      try {
        await planStore.resetDemoPlans()
        toast.add({
          severity: 'success',
          summary: 'Done',
          detail: 'Demo plans have been reset.',
          life: 3000,
        })
      } catch (err: any) {
        const detail = err?.response?.data?.error?.message
          || err?.response?.data?.message
          || err?.message
          || 'Failed to reset demo plans.'
        console.error('[resetDemo]', err?.response?.status, detail, err)
        toast.add({
          severity: 'error',
          summary: `Error ${err?.response?.status ?? ''}`.trim(),
          detail,
          life: 6000,
        })
      }
    },
  })
}

function confirmDelete(plan: any) {
  confirm.require({
    message: `Are you sure you want to delete "${plan.name}"? This will permanently remove the plan and all its scenarios.`,
    header: 'Delete Plan',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await planStore.deletePlan(plan.id)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `"${plan.name}" has been deleted.`,
          life: 3000,
        })
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete the plan. Please try again.',
          life: 4000,
        })
      }
    },
  })
}
</script>

<template>
  <div>
    <ConfirmDialog />
    <Toast />

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('nav.dashboard') }}</h1>
        <p class="text-gray-500 mt-1">
          {{ auth.user?.name ? `Welcome back, ${auth.user.name}` : 'Welcome back' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="Reset demo plans"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="confirmResetDemo"
        />
        <Button
          :label="t('nav.newPlan')"
          icon="pi pi-plus"
          @click="router.push('/plans/new')"
        />
      </div>
    </div>

    <Card>
      <template #content>
        <DataTable
          :value="planStore.plans"
          :loading="planStore.loading"
          stripedRows
          :paginator="planStore.plans.length > 10"
          :rows="10"
          class="p-datatable-sm"
          @row-click="(e: any) => openPlan(e.data)"
          selectionMode="single"
          dataKey="id"
        >
          <template #empty>
            <div class="text-center py-8 text-gray-500">
              <i class="pi pi-inbox text-4xl mb-2"></i>
              <p>No plans yet. Create your first business plan!</p>
            </div>
          </template>
          <Column field="name" header="Name" sortable class="font-medium">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <span>{{ data.name }}</span>
                <Tag v-if="data.isDemo" value="Demo" severity="info" class="text-xs" />
              </div>
            </template>
          </Column>
          <Column field="description" header="Description" />
          <Column field="status" header="Status" sortable style="width: 150px">
            <template #body="{ data }">
              <!-- Demo plans: read-only tag -->
              <Tag
                v-if="data.isDemo"
                :value="data.status"
                :severity="getStatusSeverity(data.status)"
              />
              <!-- Regular plans: inline status selector -->
              <Select
                v-else
                :model-value="data.status"
                :options="STATUS_OPTIONS"
                option-label="label"
                option-value="value"
                class="w-full text-sm"
                @change="(e: any) => changeStatus(data, e.value)"
                @click.stop
              >
                <template #value="{ value }">
                  <Tag :value="value" :severity="getStatusSeverity(value)" class="text-xs" />
                </template>
              </Select>
            </template>
          </Column>
          <Column field="updatedAt" header="Last Updated" sortable>
            <template #body="{ data }">
              {{ new Date(data.updatedAt).toLocaleDateString() }}
            </template>
          </Column>
          <Column header="" style="width: 120px">
            <template #body="{ data }">
              <div class="flex gap-1 items-center">
                <Button
                  icon="pi pi-arrow-right"
                  text
                  severity="secondary"
                  v-tooltip.top="'Open plan'"
                  @click.stop="openPlan(data)"
                />
                <Button
                  v-if="!data.isDemo"
                  icon="pi pi-trash"
                  text
                  severity="danger"
                  v-tooltip.top="'Delete plan'"
                  @click.stop="confirmDelete(data)"
                />
                <i
                  v-else
                  class="pi pi-lock text-gray-400 text-sm mx-2"
                  v-tooltip.top="'Demo plans cannot be deleted'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
