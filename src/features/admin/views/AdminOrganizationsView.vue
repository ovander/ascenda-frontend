<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  useAdminOrgsStore,
  type AdminOrg,
  type OrgTenant,
  type CreateOrgPayload,
  type UpdateOrgPayload,
  type AddOrgTenantPayload,
} from '@/features/admin/stores/adminOrgsStore'
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

const store = useAdminOrgsStore()
const toast = useToast()

// ── Plan options ──────────────────────────────────────────────────────────────
const planOptions = [
  { label: 'Enterprise', value: 'enterprise' },
  { label: 'Pro', value: 'pro' },
]

function planSeverity(plan: string): 'info' | 'secondary' | 'warn' | 'danger' | 'success' {
  switch (plan) {
    case 'enterprise': return 'danger'
    case 'pro':        return 'warn'
    default:           return 'secondary'
  }
}

// ── Create Org dialog ─────────────────────────────────────────────────────────
const showCreateDialog = ref(false)
const createForm = ref<CreateOrgPayload>({
  name: '',
  slug: '',
  plan: 'enterprise',
  maxUsers: 0,
  billingEmail: '',
  domain: '',
  ownerEmail: '',
  firstDepartmentName: '',
})
const createLoading = ref(false)

function onOrgNameInput() {
  createForm.value.slug = createForm.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function openCreate() {
  createForm.value = {
    name: '',
    slug: '',
    plan: 'enterprise',
    maxUsers: 0,
    billingEmail: '',
    domain: '',
    ownerEmail: '',
    firstDepartmentName: '',
  }
  showCreateDialog.value = true
}

async function handleCreate() {
  if (!createForm.value.name.trim() || !createForm.value.ownerEmail.trim() || !createForm.value.firstDepartmentName.trim()) return
  createLoading.value = true
  try {
    await store.createOrg(createForm.value)
    toast.add({ severity: 'success', summary: 'Created', detail: `Organization "${createForm.value.name}" created`, life: 3000 })
    showCreateDialog.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to create organization', life: 5000 })
  } finally {
    createLoading.value = false
  }
}

// ── Edit Org dialog ───────────────────────────────────────────────────────────
const showEditDialog = ref(false)
const editTarget = ref<AdminOrg | null>(null)
const editForm = ref<UpdateOrgPayload>({})
const editLoading = ref(false)

function openEdit(org: AdminOrg) {
  editTarget.value = org
  editForm.value = {
    name: org.name,
    plan: org.plan,
    maxUsers: org.maxUsers,
    billingEmail: org.billingEmail ?? '',
    domain: org.domain ?? '',
    isActive: org.isActive,
  }
  showEditDialog.value = true
}

async function handleEdit() {
  if (!editTarget.value) return
  editLoading.value = true
  try {
    await store.updateOrg(editTarget.value.id, editForm.value)
    toast.add({ severity: 'success', summary: 'Saved', detail: `Organization "${editTarget.value.name}" updated`, life: 3000 })
    showEditDialog.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to update organization', life: 5000 })
  } finally {
    editLoading.value = false
  }
}

// ── Departments (org tenants) side-panel ──────────────────────────────────────
const showDeptPanel = ref(false)
const deptOrg = ref<AdminOrg | null>(null)
const deptTenants = ref<OrgTenant[]>([])
const deptLoading = ref(false)

async function openDepts(org: AdminOrg) {
  deptOrg.value = org
  showDeptPanel.value = true
  deptLoading.value = true
  try {
    deptTenants.value = await store.fetchOrgTenants(org.id)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load departments', life: 4000 })
  } finally {
    deptLoading.value = false
  }
}

// ── Add Department dialog ─────────────────────────────────────────────────────
const showAddDeptDialog = ref(false)
const addDeptForm = ref<AddOrgTenantPayload>({ name: '', ownerEmail: '' })
const addDeptLoading = ref(false)

function openAddDept() {
  addDeptForm.value = { name: '', ownerEmail: '' }
  showAddDeptDialog.value = true
}

async function handleAddDept() {
  if (!deptOrg.value || !addDeptForm.value.name.trim() || !addDeptForm.value.ownerEmail.trim()) return
  addDeptLoading.value = true
  try {
    const newTenant = await store.addOrgTenant(deptOrg.value.id, addDeptForm.value)
    deptTenants.value.push(newTenant)
    toast.add({ severity: 'success', summary: 'Added', detail: `Department "${addDeptForm.value.name}" added`, life: 3000 })
    showAddDeptDialog.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to add department', life: 5000 })
  } finally {
    addDeptLoading.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => store.fetchOrgs())

// ── Pagination ────────────────────────────────────────────────────────────────
function onPage(event: { page: number; rows: number }) {
  store.fetchOrgs(event.page + 1, event.rows)
}

// ── Summary counts ────────────────────────────────────────────────────────────
const activeOrgs   = computed(() => store.orgs.filter(o => o.isActive).length)
const inactiveOrgs = computed(() => store.orgs.filter(o => !o.isActive).length)
const planCounts   = computed(() => {
  const counts: Record<string, number> = { enterprise: 0, pro: 0 }
  store.orgs.forEach(o => { if (counts[o.plan] !== undefined) counts[o.plan]++ })
  return counts
})

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}
</script>

<template>
  <div>
    <Toast />

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Organizations</h1>
        <p class="text-gray-500 text-sm mt-1">Enterprise accounts with multiple departments</p>
      </div>
      <Button label="New Organization" icon="pi pi-sitemap" @click="openCreate" />
    </div>

    <!-- Summary chips -->
    <div class="flex flex-wrap gap-3 mb-6">
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="text-sm text-gray-500">Total</span>
        <span class="font-bold text-gray-800">{{ store.totalOrgs }}</span>
      </div>
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
        <span class="text-sm text-gray-500">Active</span>
        <span class="font-bold text-gray-800">{{ activeOrgs }}</span>
      </div>
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
        <span class="text-sm text-gray-500">Inactive</span>
        <span class="font-bold text-gray-800">{{ inactiveOrgs }}</span>
      </div>
      <div
        v-for="opt in planOptions"
        :key="opt.value"
        class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-xs"
      >
        <Tag :value="opt.label" :severity="planSeverity(opt.value)" class="text-xs" />
        <span class="font-bold text-gray-800">{{ planCounts[opt.value] ?? 0 }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.orgsLoading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Table -->
    <DataTable
      v-else
      :value="store.orgs"
      :totalRecords="store.totalOrgs"
      :rows="store.orgsPageSize"
      :first="(store.orgsPage - 1) * store.orgsPageSize"
      lazy
      paginator
      class="p-datatable-sm"
      stripedRows
      dataKey="id"
      @page="onPage"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-sitemap text-4xl mb-3 text-gray-300 block"></i>
          <p>No organizations found.</p>
        </div>
      </template>

      <Column field="name" header="Organization" sortable>
        <template #body="{ data }">
          <div>
            <p class="font-medium text-gray-800">{{ data.name }}</p>
            <p class="text-xs text-gray-400 font-mono">{{ data.slug }}</p>
            <p v-if="data.domain" class="text-xs text-gray-400">{{ data.domain }}</p>
          </div>
        </template>
      </Column>

      <Column header="Plan" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.plan" :severity="planSeverity(data.plan)" />
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

      <Column header="Departments / Users" style="width: 160px">
        <template #body="{ data }">
          <span class="text-sm text-gray-600">
            {{ data.tenantCount }} dept{{ data.tenantCount !== 1 ? 's' : '' }}
            ·
            {{ data.activeUserCount }}{{ data.maxUsers > 0 ? ' / ' + data.maxUsers : '' }} users
          </span>
        </template>
      </Column>

      <Column header="Billing Email" style="width: 200px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ data.billingEmail || '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" style="width: 110px">
        <template #body="{ data }">
          <span class="text-sm text-gray-500">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-building-columns"
              text
              severity="secondary"
              size="small"
              v-tooltip.top="'View departments'"
              @click="openDepts(data)"
            />
            <Button
              icon="pi pi-pencil"
              text
              severity="secondary"
              size="small"
              v-tooltip.top="'Edit organization'"
              @click="openEdit(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- ── Create Organization Dialog ─────────────────────────────────────── -->
    <ResponsiveDialog
      v-model:visible="showCreateDialog"
      header="New Organization"
      size="md"
      modal
    >
      <div class="space-y-4 pt-2">
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <i class="pi pi-info-circle mr-1"></i>
          Creating an organization provisions the first department and invites the owner via email.
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
            <InputText
              v-model="createForm.name"
              class="w-full"
              placeholder="Orange SA"
              @input="onOrgNameInput"
            />
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <InputText
              v-model="createForm.slug"
              class="w-full font-mono text-sm"
              placeholder="orange-sa"
            />
            <p class="text-xs text-gray-400 mt-1">Auto-generated. Used in URLs.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <Select
              v-model="createForm.plan"
              :options="planOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Users <span class="text-gray-400">(0 = unlimited)</span></label>
            <InputNumber v-model="createForm.maxUsers" class="w-full" :min="0" :max="100000" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Billing Email</label>
            <InputText v-model="createForm.billingEmail" class="w-full" placeholder="billing@orange.com" type="email" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <InputText v-model="createForm.domain" class="w-full" placeholder="orange.com" />
          </div>
        </div>

        <hr class="border-gray-200" />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">First Department Name *</label>
          <InputText
            v-model="createForm.firstDepartmentName"
            class="w-full"
            placeholder="Orange Finance"
          />
          <p class="text-xs text-gray-400 mt-1">The first enterprise tenant (department) to provision.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
          <InputText
            v-model="createForm.ownerEmail"
            class="w-full"
            placeholder="owner@orange.com"
            type="email"
          />
          <p class="text-xs text-gray-400 mt-1">Will receive an invitation to access the first department.</p>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showCreateDialog = false" />
        <Button
          label="Create Organization"
          icon="pi pi-sitemap"
          @click="handleCreate"
          :loading="createLoading"
          :disabled="!createForm.name.trim() || !createForm.ownerEmail.trim() || !createForm.firstDepartmentName.trim()"
        />
      </template>
    </ResponsiveDialog>

    <!-- ── Edit Organization Dialog ───────────────────────────────────────── -->
    <ResponsiveDialog
      v-model:visible="showEditDialog"
      :header="`Edit — ${editTarget?.name}`"
      size="md"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <InputText v-model="editForm.name" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <Select
              v-model="editForm.plan"
              :options="planOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <p class="text-xs text-amber-500 mt-1">Changing plan cascades to all departments.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Users <span class="text-gray-400">(0 = unlimited)</span></label>
            <InputNumber v-model="editForm.maxUsers" class="w-full" :min="0" :max="100000" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Billing Email</label>
            <InputText v-model="editForm.billingEmail" class="w-full" type="email" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <InputText v-model="editForm.domain" class="w-full" />
          </div>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-700">Active</p>
            <p class="text-xs text-gray-400">Inactive organizations cannot log in</p>
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

    <!-- ── Departments Panel Dialog ────────────────────────────────────────── -->
    <ResponsiveDialog
      v-model:visible="showDeptPanel"
      :header="`Departments — ${deptOrg?.name}`"
      size="md"
      modal
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">
            Enterprise departments (tenants) within this organization.
          </p>
          <Button
            label="Add Department"
            icon="pi pi-plus"
            size="small"
            @click="openAddDept"
          />
        </div>

        <div v-if="deptLoading" class="flex justify-center py-8">
          <ProgressSpinner style="width: 40px; height: 40px" />
        </div>

        <DataTable
          v-else
          :value="deptTenants"
          class="p-datatable-sm"
          stripedRows
          dataKey="id"
        >
          <template #empty>
            <div class="text-center py-6 text-gray-500">
              <i class="pi pi-building text-3xl mb-2 text-gray-300 block"></i>
              <p class="text-sm">No departments yet.</p>
            </div>
          </template>

          <Column field="name" header="Department">
            <template #body="{ data }">
              <div>
                <p class="font-medium text-gray-800">{{ data.name }}</p>
                <p class="text-xs text-gray-400 font-mono">{{ data.slug }}</p>
              </div>
            </template>
          </Column>

          <Column header="Plan" style="width: 110px">
            <template #body="{ data }">
              <Tag :value="data.plan" :severity="planSeverity(data.plan)" />
            </template>
          </Column>

          <Column header="Status" style="width: 90px">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? 'Active' : 'Inactive'"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>

          <Column field="createdAt" header="Created" style="width: 100px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <template #footer>
        <Button label="Close" text severity="secondary" @click="showDeptPanel = false" />
      </template>
    </ResponsiveDialog>

    <!-- ── Add Department Dialog ──────────────────────────────────────────── -->
    <ResponsiveDialog
      v-model:visible="showAddDeptDialog"
      header="Add Department"
      size="sm"
      modal
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
          <InputText
            v-model="addDeptForm.name"
            class="w-full"
            placeholder="Orange Marketing"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
          <InputText
            v-model="addDeptForm.ownerEmail"
            class="w-full"
            placeholder="dept-owner@orange.com"
            type="email"
          />
          <p class="text-xs text-gray-400 mt-1">Will receive an invitation to access this department.</p>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="showAddDeptDialog = false" />
        <Button
          label="Add Department"
          icon="pi pi-building"
          @click="handleAddDept"
          :loading="addDeptLoading"
          :disabled="!addDeptForm.name.trim() || !addDeptForm.ownerEmail.trim()"
        />
      </template>
    </ResponsiveDialog>
  </div>
</template>
