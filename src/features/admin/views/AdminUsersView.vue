<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  useAdminUsersStore,
  type CreateUserPayload,
  type UpdateUserPayload,
  type AdminUser,
} from '@/features/admin/stores/adminUsersStore'
import { useToast } from 'primevue/usetoast'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'

const store = useAdminUsersStore()
const toast = useToast()

// ── Filters ───────────────────────────────────────────────────────────────────
const searchQuery   = ref('')
const filterRole    = ref<string | null>(null)
const filterStatus  = ref<string | null>(null)

const roleOptions   = [
  { label: 'All roles',   value: null },
  { label: 'Admin',       value: 'admin' },   // Socrate admin = Ascenda admin
  { label: 'Owner',       value: 'owner' },   // Ascenda tenant owner
  { label: 'User',        value: 'user' },    // Ascenda tenant member
]

const statusOptions = [
  { label: 'All statuses', value: null },
  { label: 'Active',       value: 'active' },
  { label: 'Inactive',     value: 'inactive' },
  { label: 'Unverified',   value: 'unverified' },
]

let searchDebounce: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => triggerFetch(), 300)
}

function triggerFetch() {
  store.fetchUsers(searchQuery.value, 1, store.usersPageSize)
}

// ── Invite dialog ─────────────────────────────────────────────────────────────
const showInviteDialog = ref(false)
const inviteForm       = ref<CreateUserPayload>({ email: '', fullName: '' })
const inviteLoading    = ref(false)

// ── Edit dialog ───────────────────────────────────────────────────────────────
const showEditDialog = ref(false)
const editTarget     = ref<AdminUser | null>(null)
const editForm       = ref<UpdateUserPayload>({})
const editLoading    = ref(false)

function openEdit(user: AdminUser) {
  editTarget.value = user
  // Socrate admins are always Ascenda admins — derived, not stored locally.
  const effectiveAscendaRole = user.role === 'admin' ? 'admin' : (user.ascendaRole || 'user')
  editForm.value   = { fullName: user.name, ascendaRole: effectiveAscendaRole, plan: user.plan || 'freemium' }
  showEditDialog.value = true
}

const editRoleOptions = [
  { label: 'User',  value: 'user' },
  { label: 'Owner', value: 'owner' },
]

const editPlanOptions = [
  { label: 'Freemium', value: 'freemium' },
  { label: 'Pro',      value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
]

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => store.fetchUsers())

// ── Filtered data (client-side filtering on top of server-side pagination) ────
const filteredUsers = computed(() => {
  return store.users.filter(u => {
    if (filterRole.value) {
      // "admin" matches Socrate-level admins; other values match the Ascenda tenant role
      if (filterRole.value === 'admin' && u.role !== 'admin') return false
      if (filterRole.value !== 'admin' && u.ascendaRole !== filterRole.value) return false
    }
    if (filterStatus.value === 'active'     && (!u.isActive || !u.isVerified)) return false
    if (filterStatus.value === 'inactive'   && u.isActive)   return false
    if (filterStatus.value === 'unverified' && u.isVerified)  return false
    return true
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusSeverity(u: AdminUser) {
  if (!u.isVerified) return 'warn'
  if (!u.isActive)   return 'secondary'
  return 'success'
}

function statusLabel(u: AdminUser) {
  if (!u.isVerified) return 'Unverified'
  if (!u.isActive)   return 'Inactive'
  return 'Active'
}

function roleSeverity(role?: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
}

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  const parsed = new Date(d)
  if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) return '—'
  return parsed.toLocaleDateString()
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

async function handleEdit() {
  if (!editTarget.value) return
  editLoading.value = true
  try {
    // Only send fields that actually changed — keeps Socrate calls out of
    // plan-only or ascendaRole-only saves (those are local to the backend).
    const user = editTarget.value
    const payload: UpdateUserPayload = {}
    if (editForm.value.fullName !== user.name)                     payload.fullName    = editForm.value.fullName
    if (editForm.value.ascendaRole !== (user.ascendaRole || 'user')) payload.ascendaRole = editForm.value.ascendaRole
    if (editForm.value.plan       !== (user.plan       || 'freemium')) payload.plan    = editForm.value.plan
    await store.updateUser(user.socrateId, payload)
    toast.add({ severity: 'success', summary: 'Saved', detail: `${editTarget.value.email} updated`, life: 3000 })
    showEditDialog.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || err.message || 'Failed to update user', life: 5000 })
  } finally {
    editLoading.value = false
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
    <PageContainer>
      <PageHeader>
        <template #title>Platform Users</template>
        <template #subtitle>All users registered in the identity provider — platform-wide view</template>
        <template #actions>
          <Button label="Create User" icon="pi pi-user-plus" @click="showInviteDialog = true" />
        </template>
      </PageHeader>

    <!-- Filters bar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <IconField class="flex-1 min-w-48 max-w-80">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by name or email…"
          class="w-full"
          @input="onSearch"
        />
      </IconField>

      <Select
        v-model="filterRole"
        :options="roleOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All roles"
        class="w-36"
      />

      <Select
        v-model="filterStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All statuses"
        class="w-40"
      />

      <span v-if="filterRole || filterStatus || searchQuery" class="text-xs text-gray-400">
        {{ filteredUsers.length }} result{{ filteredUsers.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="store.usersLoading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Table -->
    <DataTable
      v-else
      :value="filteredUsers"
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
          <div class="font-medium text-gray-800">{{ data.name || '—' }}</div>
        </template>
      </Column>

      <Column field="email" header="Email" sortable />

      <Column header="Tenant" style="width: 180px">
        <template #body="{ data }">
          <span v-if="data.tenantName" class="text-sm">{{ data.tenantName }}</span>
          <span v-else class="text-gray-400 text-sm italic">no tenant</span>
        </template>
      </Column>

      <Column header="Role" style="width: 120px">
        <template #body="{ data }">
          <!-- Socrate admin = Ascenda admin -->
          <Tag
            v-if="data.role === 'admin'"
            value="admin"
            severity="warn"
          />
          <!-- Socrate user → show their Ascenda tenant role (owner, reader, …) -->
          <template v-else>
            <Tag
              v-if="data.ascendaRole"
              :value="data.ascendaRole"
              :severity="roleSeverity(data.ascendaRole)"
            />
            <span v-else class="text-gray-400 text-xs italic">—</span>
          </template>
        </template>
      </Column>

      <Column header="Plan" style="width: 110px">
        <template #body="{ data }">
          <Tag
            v-if="data.plan"
            :value="data.plan"
            :severity="data.plan === 'enterprise' ? 'danger' : data.plan === 'pro' ? 'warn' : 'secondary'"
          />
          <span v-else class="text-gray-400 text-xs italic">—</span>
        </template>
      </Column>

      <Column header="Status" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="statusLabel(data)" :severity="statusSeverity(data)" />
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

      <Column header="Actions" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              text
              severity="secondary"
              size="small"
              v-tooltip.top="'Edit user'"
              @click="openEdit(data)"
            />
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
    <ResponsiveDialog
      v-model:visible="showInviteDialog"
      header="Create / Invite User"
      size="sm"
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
          <InputText v-model="inviteForm.fullName" class="w-full" placeholder="First Last" />
        </div>
        <p class="text-xs text-gray-400">
          The user will receive an invitation email. They won't have access to any Ascenda
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
    </ResponsiveDialog>

    <!-- Edit User Dialog -->
    <ResponsiveDialog
      v-model:visible="showEditDialog"
      :header="`Edit — ${editTarget?.email}`"
      size="sm"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <InputText v-model="editForm.fullName" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tenant Role</label>
          <Select
            v-model="editForm.ascendaRole"
            :options="editRoleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            :disabled="editTarget?.role === 'admin'"
          />
          <p v-if="editTarget?.role === 'admin'" class="text-xs text-amber-600 mt-1">
            Socrate admins are always Ascenda admins — derived from their platform role, not stored locally.
          </p>
          <p v-else class="text-xs text-gray-400 mt-1">
            <strong>Owner</strong> manages the organisation (billing, members). <strong>User</strong> is a regular plan member.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Commercial Plan</label>
          <Select
            v-model="editForm.plan"
            :options="editPlanOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
          <p class="text-xs text-gray-400 mt-1">
            Controls feature access: <strong>Freemium</strong> has limited plans. <strong>Pro</strong> unlocks reports and advanced features. <strong>Enterprise</strong> has no limits.
          </p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showEditDialog = false" />
        <Button
          label="Save Changes"
          icon="pi pi-check"
          @click="handleEdit"
          :loading="editLoading"
        />
      </template>
    </ResponsiveDialog>
    </PageContainer>
  </div>
</template>
