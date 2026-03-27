<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from 'primevue/usetoast'
import type { User } from '@/types'
import SafeDeleteModal from '@/components/SafeDeleteModal.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'

const tenantStore = useTenantStore()
const toast = useToast()

const showInviteDialog = ref(false)
const inviteForm = ref({ email: '', name: '', role: 'user' })
const inviteLoading = ref(false)

// Owners can only invite regular users. Platform admin (role=admin) is a
// KerPlan operator role assigned directly — owners cannot grant it.
const roleOptions = computed(() => [
  { label: 'User', value: 'user', description: 'Business user — plan access via memberships' },
])

const roleSeverity = (role: string) => {
  switch (role) {
    case 'owner': return 'danger'
    case 'admin': return 'warn'
    case 'user': return 'info'
    default: return 'secondary'
  }
}

onMounted(async () => {
  try {
    await tenantStore.fetchUsers()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users', life: 3000 })
  }
})

async function handleInvite() {
  if (!inviteForm.value.email.trim()) return
  inviteLoading.value = true
  try {
    await tenantStore.inviteUser(inviteForm.value.email, inviteForm.value.role)
    toast.add({ severity: 'success', summary: 'Invited', detail: `Invitation sent to ${inviteForm.value.email}`, life: 3000 })
    showInviteDialog.value = false
    inviteForm.value = { email: '', name: '', role: 'user' }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to invite user', life: 5000 })
  } finally {
    inviteLoading.value = false
  }
}

async function toggleActive(user: User) {
  try {
    if (user.isActive) {
      await tenantStore.deactivateUser(user.id)
      toast.add({ severity: 'warn', summary: 'Deactivated', detail: `${user.email} has been deactivated`, life: 3000 })
    } else {
      await tenantStore.reactivateUser(user.id)
      toast.add({ severity: 'success', summary: 'Reactivated', detail: `${user.email} has been reactivated`, life: 3000 })
    }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Action failed', life: 5000 })
  }
}

// ── User safe-delete ──────────────────────────────────────────────────────────

interface UserImpactResult {
  userId: string
  email: string
  name: string
  role: string
  isOwner: boolean
  canDelete: boolean
  message?: string
}

const showDeleteUserModal = ref(false)
const deleteUserTarget = ref<User | null>(null)
const deleteUserImpact = ref<UserImpactResult | null>(null)
const deleteUserLoading = ref(false)
const userImpactLoading = ref(false)

async function openDeleteUser(user: User) {
  deleteUserTarget.value = user
  deleteUserImpact.value = null
  showDeleteUserModal.value = true
  userImpactLoading.value = true
  try {
    deleteUserImpact.value = await tenantStore.getUserImpact(user.id)
  } catch {
    // proceed without impact preview
  } finally {
    userImpactLoading.value = false
  }
}

function userImpactLines(impact: UserImpactResult | null): string[] {
  if (!impact?.message) return []
  return [impact.message]
}

async function confirmDeleteUser() {
  if (!deleteUserTarget.value) return
  deleteUserLoading.value = true
  try {
    await tenantStore.deleteUser(deleteUserTarget.value.id)
    showDeleteUserModal.value = false
    toast.add({ severity: 'success', summary: 'Removed', detail: `${deleteUserTarget.value.email} has been removed.`, life: 3000 })
    deleteUserTarget.value = null
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to remove user', life: 5000 })
  } finally {
    deleteUserLoading.value = false
  }
}

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}
</script>

<template>
  <div>
    <Toast />

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">User Management</h1>
        <p class="text-gray-500 text-sm mt-1">Manage users in your organization</p>
      </div>
      <Button label="Invite User" icon="pi pi-user-plus" @click="showInviteDialog = true" />
    </div>

    <div v-if="tenantStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="tenantStore.users"
      class="p-datatable-sm"
      stripedRows
      dataKey="id"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-users text-4xl mb-3 text-gray-300"></i>
          <p>No users yet. Invite your first team member.</p>
        </div>
      </template>

      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ data.name || '—' }}</span>
            <Tag v-if="!data.joinedAt" value="Pending" severity="warn" class="text-xs" />
          </div>
        </template>
      </Column>

      <Column field="email" header="Email" sortable />

      <Column field="role" header="Role" sortable style="width: 160px">
        <template #body="{ data }">
          <div v-if="data.role === 'owner'">
            <Tag value="Owner" :severity="roleSeverity('owner')" />
          </div>
          <Tag v-else :value="data.role" :severity="roleSeverity(data.role)" />
        </template>
      </Column>

      <Column field="isActive" header="Status" style="width: 100px">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? 'Active' : 'Inactive'"
            :severity="data.isActive ? 'success' : 'secondary'"
          />
        </template>
      </Column>

      <Column field="joinedAt" header="Joined" sortable style="width: 120px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ formatDate(data.joinedAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 130px">
        <template #body="{ data }">
          <div v-if="data.role !== 'owner'" class="flex gap-1">
            <Button
              v-if="data.isActive"
              icon="pi pi-ban"
              text
              severity="warn"
              size="small"
              v-tooltip="'Deactivate'"
              @click="toggleActive(data)"
            />
            <Button
              v-else
              icon="pi pi-check-circle"
              text
              severity="success"
              size="small"
              v-tooltip="'Reactivate'"
              @click="toggleActive(data)"
            />
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              size="small"
              v-tooltip="'Delete permanently'"
              @click="openDeleteUser(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Invite Dialog -->
    <Dialog v-model:visible="showInviteDialog" header="Invite User" :style="{ width: '450px' }" modal>
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <InputText
            v-model="inviteForm.name"
            class="w-full"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <InputText
            v-model="inviteForm.email"
            class="w-full"
            placeholder="colleague@company.com"
            type="email"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Select
            v-model="inviteForm.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
          <p class="text-xs text-gray-400 mt-1">
            {{ roleOptions.find(o => o.value === inviteForm.role)?.description }}
          </p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showInviteDialog = false" />
        <Button
          label="Send Invite"
          icon="pi pi-send"
          @click="handleInvite"
          :loading="inviteLoading"
          :disabled="!inviteForm.email.trim()"
        />
      </template>
    </Dialog>

    <!-- User Safe Delete Modal -->
    <SafeDeleteModal
      v-model:visible="showDeleteUserModal"
      entity-type="User"
      :entity-name="deleteUserTarget?.email ?? ''"
      :impact-lines="userImpactLines(deleteUserImpact)"
      :blocked="deleteUserImpact?.canDelete === false"
      :blocked-reason="deleteUserImpact?.message"
      :loading="deleteUserLoading || userImpactLoading"
      action-label="Remove user"
      @confirm="confirmDeleteUser"
    />
  </div>
</template>
