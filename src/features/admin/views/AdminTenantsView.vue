<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  useAdminUsersStore,
  type AdminTenant,
  type CreateTenantPayload,
  type UpdateTenantPayload,
} from '@/features/admin/stores/adminUsersStore'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'

const store = useAdminUsersStore()
const toast = useToast()

// ── Create dialog ─────────────────────────────────────────────────────────────
const showCreateDialog = ref(false)
const createForm = ref<CreateTenantPayload>({ name: '', slug: '', tier: 'starter', maxUsers: 5, maxPlans: 3 })
const createLoading = ref(false)

function onNameInput() {
  createForm.value.slug = createForm.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Edit dialog ───────────────────────────────────────────────────────────────
const showEditDialog = ref(false)
const editTarget = ref<AdminTenant | null>(null)
const editForm = ref<UpdateTenantPayload>({})
const editLoading = ref(false)

function openEdit(tenant: AdminTenant) {
  editTarget.value = tenant
  editForm.value = {
    name: tenant.name,
    tier: tenant.tier,
    isActive: tenant.isActive,
    maxUsers: tenant.maxUsers,
    maxPlans: tenant.maxPlans,
  }
  showEditDialog.value = true
}

// ── Tier options ──────────────────────────────────────────────────────────────
const tierOptions = [
  { label: 'Starter', value: 'starter' },
  { label: 'Standard', value: 'standard' },
  { label: 'Pro', value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
]

function tierSeverity(tier: string): 'info' | 'secondary' | 'warn' | 'danger' | 'success' {
  switch (tier) {
    case 'enterprise': return 'danger'
    case 'pro':        return 'warn'
    case 'standard':   return 'info'
    default:           return 'secondary'
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => store.fetchTenants())

// ── Pagination ────────────────────────────────────────────────────────────────
function onPage(event: { page: number; rows: number }) {
  store.fetchTenants(event.page + 1, event.rows)
}

// ── Counts ────────────────────────────────────────────────────────────────────
const activeTenants  = computed(() => store.tenants.filter(t => t.isActive).length)
const inactiveTenants = computed(() => store.tenants.filter(t => !t.isActive).length)

const tierCounts = computed(() => {
  const counts: Record<string, number> = { starter: 0, standard: 0, pro: 0, enterprise: 0 }
  store.tenants.forEach(t => { if (counts[t.tier] !== undefined) counts[t.tier]++ })
  return counts
})

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleCreate() {
  if (!createForm.value.name.trim() || !createForm.value.slug.trim()) return
  createLoading.value = true
  try {
    await store.createTenant(createForm.value)
    toast.add({ severity: 'success', summary: 'Created', detail: `Tenant "${createForm.value.name}" created`, life: 3000 })
    showCreateDialog.value = false
    createForm.value = { name: '', slug: '', tier: 'starter', maxUsers: 5, maxPlans: 3 }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to create tenant', life: 5000 })
  } finally {
    createLoading.value = false
  }
}

async function handleEdit() {
  if (!editTarget.value) return
  editLoading.value = true
  try {
    await store.updateTenant(editTarget.value.id, editForm.value)
    toast.add({ severity: 'success', summary: 'Saved', detail: `Tenant "${editTarget.value.name}" updated`, life: 3000 })
    showEditDialog.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to update tenant', life: 5000 })
  } finally {
    editLoading.value = false
  }
}
</script>

<template>
  <div>
    <Toast />

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Tenants</h1>
        <p class="text-gray-500 text-sm mt-1">All organisations registered on the platform</p>
      </div>
      <Button label="New Tenant" icon="pi pi-plus" @click="showCreateDialog = true" />
    </div>

    <!-- Summary chips -->
    <div class="flex flex-wrap gap-3 mb-6">
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="text-sm text-gray-500">Total</span>
        <span class="font-bold text-gray-800">{{ store.totalTenants }}</span>
      </div>
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
        <span class="text-sm text-gray-500">Active</span>
        <span class="font-bold text-gray-800">{{ activeTenants }}</span>
      </div>
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
        <span class="text-sm text-gray-500">Inactive</span>
        <span class="font-bold text-gray-800">{{ inactiveTenants }}</span>
      </div>
      <div
        v-for="opt in tierOptions"
        :key="opt.value"
        class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs"
      >
        <Tag :value="opt.label" :severity="tierSeverity(opt.value)" class="text-xs" />
        <span class="font-bold text-gray-800">{{ tierCounts[opt.value] }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.tenantsLoading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Table -->
    <DataTable
      v-else
      :value="store.tenants"
      :totalRecords="store.totalTenants"
      :rows="store.tenantsPageSize"
      :first="(store.tenantsPage - 1) * store.tenantsPageSize"
      lazy
      paginator
      class="p-datatable-sm"
      stripedRows
      dataKey="id"
      @page="onPage"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-building text-4xl mb-3 text-gray-300 block"></i>
          <p>No tenants found.</p>
        </div>
      </template>

      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <div>
            <p class="font-medium text-gray-800">{{ data.name }}</p>
            <p class="text-xs text-gray-400 font-mono">{{ data.slug }}</p>
          </div>
        </template>
      </Column>

      <Column header="Type" style="width: 120px">
        <template #body="{ data }">
          <Tag
            :value="data.type === 'enterprise' ? 'Enterprise' : 'Workspace'"
            :severity="data.type === 'enterprise' ? 'danger' : 'secondary'"
          />
        </template>
      </Column>

      <Column header="Organization" style="width: 160px">
        <template #body="{ data }">
          <span v-if="data.organizationName" class="text-sm text-gray-700 font-medium">
            {{ data.organizationName }}
          </span>
          <span v-else class="text-sm text-gray-400">—</span>
        </template>
      </Column>

      <Column header="Tier" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.tier" :severity="tierSeverity(data.tier)" />
        </template>
      </Column>

      <Column header="Status" style="width: 100px">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? 'Active' : 'Inactive'"
            :severity="data.isActive ? 'success' : 'secondary'"
          />
        </template>
      </Column>

      <Column header="Limits" style="width: 140px">
        <template #body="{ data }">
          <span class="text-sm text-gray-600">
            {{ data.maxUsers }} users · {{ data.maxPlans }} plans
          </span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" style="width: 110px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 80px">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            text
            severity="secondary"
            size="small"
            v-tooltip.top="'Edit tenant'"
            @click="openEdit(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Create Tenant Dialog -->
    <ResponsiveDialog
      v-model:visible="showCreateDialog"
      header="New Tenant"
      size="md"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Organisation Name *</label>
          <InputText
            v-model="createForm.name"
            class="w-full"
            placeholder="Acme Corp"
            @input="onNameInput"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <InputText
            v-model="createForm.slug"
            class="w-full font-mono text-sm"
            placeholder="acme-corp"
          />
          <p class="text-xs text-gray-400 mt-1">Auto-generated from name. Used in URLs.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tier</label>
          <Select
            v-model="createForm.tier"
            :options="tierOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
            <InputNumber v-model="createForm.maxUsers" class="w-full" :min="1" :max="500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Plans</label>
            <InputNumber v-model="createForm.maxPlans" class="w-full" :min="1" :max="100" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showCreateDialog = false" />
        <Button
          label="Create Tenant"
          icon="pi pi-building"
          @click="handleCreate"
          :loading="createLoading"
          :disabled="!createForm.name.trim() || !createForm.slug.trim()"
        />
      </template>
    </ResponsiveDialog>

    <!-- Edit Tenant Dialog -->
    <ResponsiveDialog
      v-model:visible="showEditDialog"
      :header="`Edit — ${editTarget?.name}`"
      size="md"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
          <InputText v-model="editForm.name" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tier</label>
          <Select
            v-model="editForm.tier"
            :options="tierOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
            <InputNumber v-model="editForm.maxUsers" class="w-full" :min="1" :max="500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Plans</label>
            <InputNumber v-model="editForm.maxPlans" class="w-full" :min="1" :max="100" />
          </div>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-700">Active</p>
            <p class="text-xs text-gray-400">Inactive tenants cannot log in</p>
          </div>
          <ToggleSwitch v-model="editForm.isActive" />
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
  </div>
</template>
