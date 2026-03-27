<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdminUsersStore, type CreateUserPayload } from '@/features/admin/stores/adminUsersStore'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const store = useAdminUsersStore()
const toast = useToast()

// ── Invite dialog ─────────────────────────────────────────────────────────────
const showInviteDialog = ref(false)
const inviteForm = ref<CreateUserPayload>({ email: '', fullName: '' })
const inviteLoading = ref(false)

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
let searchDebounce: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    store.fetchUsers(searchQuery.value, 1, store.usersPageSize)
  }, 300)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchUsers()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusSeverity(u: typeof store.users[0]) {
  if (!u.isVerified) return 'warn'
  if (!u.isActive) return 'secondary'
  return 'success'
}

function statusLabel(u: typeof store.users[0]) {
  if (!u.isVerified) return 'Unverified'
  if (!u.isActive) return 'Inactive'
  return 'Active'
}

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleInvite() {
  if (!inviteForm.value.email.trim() || !inviteForm.value.fullName.trim()) return
  inviteLoading.value = true
  try {
    await store.createUser(inviteForm.value)
    toast.add({ severity: 'success', summary: 'Invited', detail: `Invitation sent to ${inviteForm.value.email}`, life: 3000 })
    showInviteDialog.value = false
    inviteForm.value = { email: '', fullName: '' }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to invite user', life: 5000 })
  } finally {
    inviteLoading.value = false
  }
}

async function handleResendVerification(socrateId: number, email: string) {
  try {
    await store.resendVerification(socrateId)
    toast.add({ severity: 'success', summary: 'Sent', detail: `Verification email sent to ${email}`, life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to resend', life: 5000 })
  }
}

async function handleResetPassword(socrateId: number, email: string) {
  try {
    await store.resetPassword(socrateId)
    toast.add({ severity: 'success', summary: 'Sent', detail: `Password reset sent to ${email}`, life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to reset password', life: 5000 })
  }
}

async function handleDelete(socrateId: number, email: string) {
  if (!confirm(`Delete user ${email}? This will remove them from the identity provider.`)) return
  try {
    await store.deleteUser(socrateId)
    toast.add({ severity: 'warn', summary: 'Deleted', detail: `${email} has been removed`, life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to delete user', life: 5000 })
  }
}

// ── Pagination ────────────────────────────────────────────────────────────────
function onPage(event: { page: number; rows: number }) {
  store.fetchUsers(searchQuery.value, event.page + 1, event.rows)
}
</script>

<template>
  <div>
    <Toast />

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Platform Users</h1>
        <p class="text-gray-500 text-sm mt-1">
          All users registered in the identity provider — platform-wide view
        </p>
      </div>
      <Button label="Create User" icon="pi pi-user-plus" @click="showInviteDialog = true" />
    </div>

    <!-- Search bar -->
    <div class="mb-4">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by name or email…"
          class="w-full md:w-80"
          @input="onSearch"
        />
      </IconField>
    </div>

    <!-- Loading -->
    <div v-if="store.usersLoading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Table -->
    <DataTable
      v-else
      :value="store.users"
      :totalRecords="store.totalUsers"
      :rows="store.usersPageSize"
      :first="(store.usersPage - 1) * store.usersPageSize"
      lazy
      paginator
      class="p-datatable-sm"
      stripedRows
      dataKey="socrateId"
      @page="onPage"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-users text-4xl mb-3 text-gray-300 block"></i>
          <p>No users found{{ searchQuery ? ' matching your search' : '' }}.</p>
        </div>
      </template>

      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <div class="font-medium">{{ data.name || '—' }}</div>
        </template>
      </Column>

      <Column field="email" header="Email" sortable />

      <Column header="Tenant" style="width: 180px">
        <template #body="{ data }">
          <span v-if="data.tenantName" class="text-sm">{{ data.tenantName }}</span>
          <span v-else class="text-gray-400 text-sm italic">no tenant</span>
        </template>
      </Column>

      <Column header="KerPlan Role" style="width: 130px">
        <template #body="{ data }">
          <Tag
            v-if="data.kerplanRole"
            :value="data.kerplanRole"
            :severity="data.kerplanRole === 'owner' ? 'danger' : 'info'"
          />
          <span v-else class="text-gray-400 text-xs italic">—</span>
        </template>
      </Column>

      <Column header="Status" style="width: 120px">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data)"
            :severity="statusSeverity(data)"
          />
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 110px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>

      <Column field="lastLogin" header="Last Login" style="width: 110px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ formatDate(data.lastLogin) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 130px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="!data.isVerified"
              icon="pi pi-envelope"
              text
              severity="warn"
              size="small"
              v-tooltip.top="'Resend verification'"
              @click="handleResendVerification(data.socrateId, data.email)"
            />
            <Button
              icon="pi pi-key"
              text
              severity="secondary"
              size="small"
              v-tooltip.top="'Reset password'"
              @click="handleResetPassword(data.socrateId, data.email)"
            />
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              size="small"
              v-tooltip.top="'Delete user'"
              @click="handleDelete(data.socrateId, data.email)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create User Dialog -->
    <Dialog
      v-model:visible="showInviteDialog"
      header="Create / Invite User"
      :style="{ width: '480px' }"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <InputText
            v-model="inviteForm.email"
            class="w-full"
            placeholder="user@company.com"
            type="email"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <InputText
            v-model="inviteForm.fullName"
            class="w-full"
            placeholder="First Last"
          />
        </div>
        <p class="text-xs text-gray-400">
          The user will receive an invitation email. They won't have access to any KerPlan
          workspace until an owner adds them to a tenant.
        </p>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showInviteDialog = false" />
        <Button
          label="Send Invite"
          icon="pi pi-send"
          @click="handleInvite"
          :loading="inviteLoading"
          :disabled="!inviteForm.email.trim() || !inviteForm.fullName.trim()"
        />
      </template>
    </Dialog>
  </div>
</template>
