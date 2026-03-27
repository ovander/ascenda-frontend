<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { usePlanMembersStore } from '@/stores/planMembers'
import { useTenantStore } from '@/stores/tenant'
import { useAuth } from '@/composables/useAuth'
import { useToast } from 'primevue/usetoast'
import type { User } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Toast from 'primevue/toast'

const props = defineProps<{ planId: string }>()

const membersStore = usePlanMembersStore()
const tenantStore = useTenantStore()
const { isOwner } = useAuth()
const toast = useToast()

const showAddDialog = ref(false)
const addForm = ref({ userId: '', role: 'viewer' as 'editor' | 'viewer' })
const addLoading = ref(false)

// Available users that aren't already members
const availableUsers = computed(() => {
  const memberIds = new Set(membersStore.members.map(m => m.userId))
  return (tenantStore.users || []).filter(u =>
    u.isActive && u.role === 'user' && !memberIds.has(u.id)
  )
})

const roleOptions = [
  { label: 'Editor', value: 'editor', description: 'Can view and edit plan data' },
  { label: 'Viewer', value: 'viewer', description: 'Read-only access' },
]

const roleSeverity = (role: string) => {
  switch (role) {
    case 'editor': return 'info'
    case 'viewer': return 'secondary'
    default: return 'secondary'
  }
}

onMounted(async () => {
  await membersStore.fetchMembers(props.planId)
  // Load tenant users for the "Add" dialog
  if (isOwner.value) {
    try { await tenantStore.fetchUsers() } catch { /* non-fatal */ }
  }
})

async function handleAdd() {
  if (!addForm.value.userId) return
  addLoading.value = true
  try {
    await membersStore.grantAccess(props.planId, addForm.value.userId, addForm.value.role)
    toast.add({ severity: 'success', summary: 'Added', detail: 'User granted access to this plan', life: 3000 })
    showAddDialog.value = false
    addForm.value = { userId: '', role: 'viewer' }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to grant access', life: 5000 })
  } finally {
    addLoading.value = false
  }
}

async function handleChangeRole(userId: string, newRole: 'editor' | 'viewer') {
  try {
    await membersStore.changeRole(props.planId, userId, newRole)
    toast.add({ severity: 'success', summary: 'Updated', detail: `Role changed to ${newRole}`, life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to change role', life: 5000 })
  }
}

async function handleRevoke(userId: string) {
  if (!confirm('Remove this user\'s access to this plan?')) return
  try {
    await membersStore.revokeAccess(props.planId, userId)
    toast.add({ severity: 'warn', summary: 'Revoked', detail: 'Access removed', life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to revoke access', life: 5000 })
  }
}
</script>

<template>
  <div>
    <Toast />

    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-800">Plan Members</h2>
      <Button v-if="isOwner" label="Add Member" icon="pi pi-user-plus" size="small" @click="showAddDialog = true" />
    </div>

    <div v-if="membersStore.members.length === 0" class="text-center py-6 text-gray-400 border rounded-lg">
      <i class="pi pi-users text-3xl mb-2"></i>
      <p class="text-sm">No members yet. Only the owner has access to this plan.</p>
    </div>

    <DataTable
      v-else
      :value="membersStore.members"
      class="p-datatable-sm"
      stripedRows
      dataKey="id"
    >
      <Column header="User" style="min-width: 200px">
        <template #body="{ data }">
          <div>
            <span class="font-medium">{{ data.name || data.email || data.userId }}</span>
            <span v-if="data.email" class="text-xs text-gray-400 ml-2">{{ data.email }}</span>
          </div>
        </template>
      </Column>

      <Column header="Role" style="width: 160px">
        <template #body="{ data }">
          <Select
            v-if="isOwner"
            :modelValue="data.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            @update:modelValue="(v: string) => handleChangeRole(data.userId, v as 'editor' | 'viewer')"
          />
          <Tag v-else :value="data.role" :severity="roleSeverity(data.role)" />
        </template>
      </Column>

      <Column header="Since" style="width: 120px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ new Date(data.createdAt).toLocaleDateString() }}</span>
        </template>
      </Column>

      <Column v-if="isOwner" header="" style="width: 60px">
        <template #body="{ data }">
          <Button
            icon="pi pi-times"
            text
            severity="danger"
            size="small"
            v-tooltip="'Revoke access'"
            @click="handleRevoke(data.userId)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Add Member Dialog -->
    <Dialog v-model:visible="showAddDialog" header="Grant Plan Access" :style="{ width: '450px' }" modal>
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
          <Select
            v-model="addForm.userId"
            :options="availableUsers"
            optionLabel="email"
            optionValue="id"
            class="w-full"
            placeholder="Select a user"
            filter
          >
            <template #option="{ option }">
              <div>
                <span class="font-medium">{{ option.name || option.email }}</span>
                <span v-if="option.name" class="text-xs text-gray-400 ml-2">{{ option.email }}</span>
              </div>
            </template>
          </Select>
          <p v-if="availableUsers.length === 0" class="text-xs text-gray-400 mt-1">
            All users already have access, or no users are available. Invite new users first.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Select
            v-model="addForm.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
          <p class="text-xs text-gray-400 mt-1">
            {{ roleOptions.find(o => o.value === addForm.role)?.description }}
          </p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showAddDialog = false" />
        <Button
          label="Grant Access"
          icon="pi pi-check"
          @click="handleAdd"
          :loading="addLoading"
          :disabled="!addForm.userId"
        />
      </template>
    </Dialog>
  </div>
</template>
