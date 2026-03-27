<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'

const tenantStore = useTenantStore()
const toast = useToast()

const form = ref({
  name: '',
  slug: '',
})
const saving = ref(false)

onMounted(async () => {
  try {
    await tenantStore.fetchTenant()
    if (tenantStore.tenant) {
      form.value.name = tenantStore.tenant.name
      form.value.slug = tenantStore.tenant.slug
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tenant settings', life: 3000 })
  }
})

async function handleSave() {
  saving.value = true
  try {
    await tenantStore.updateTenant({
      name: form.value.name,
      slug: form.value.slug,
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Tenant settings updated', life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error?.message || 'Failed to save', life: 5000 })
  } finally {
    saving.value = false
  }
}

const tierSeverity = (tier: string) => {
  switch (tier) {
    case 'enterprise': return 'danger'
    case 'pro': return 'warn'
    case 'starter': return 'info'
    default: return 'secondary'
  }
}
</script>

<template>
  <div>
    <Toast />

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Tenant Settings</h1>
      <p class="text-gray-500 text-sm mt-1">Manage your organization's settings and subscription</p>
    </div>

    <div v-if="tenantStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else-if="tenantStore.tenant" class="space-y-6 max-w-3xl">
      <!-- Organization Info -->
      <div class="border rounded-lg p-5 bg-white">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">Organization</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <InputText v-model="form.name" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <InputText v-model="form.slug" class="w-full" />
          </div>
        </div>
        <div class="mt-4">
          <Button label="Save" icon="pi pi-check" @click="handleSave" :loading="saving" />
        </div>
      </div>

      <!-- Subscription Tier -->
      <div class="border rounded-lg p-5 bg-white">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">Subscription</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 border rounded-lg text-center">
            <span class="text-xs font-semibold text-gray-500 uppercase">Current Plan</span>
            <div class="mt-2">
              <Tag :value="tenantStore.tenant.tier || 'free'" :severity="tierSeverity(tenantStore.tenant.tier)" class="text-lg" />
            </div>
          </div>
          <div class="p-4 border rounded-lg text-center">
            <span class="text-xs font-semibold text-gray-500 uppercase">Max Plans</span>
            <p class="text-2xl font-bold text-blue-600 mt-2">{{ tenantStore.tenant.maxPlans || 3 }}</p>
          </div>
          <div class="p-4 border rounded-lg text-center">
            <span class="text-xs font-semibold text-gray-500 uppercase">Max Users</span>
            <p class="text-2xl font-bold text-green-600 mt-2">{{ tenantStore.tenant.maxUsers || 5 }}</p>
          </div>
        </div>

        <div v-if="tenantStore.tenant.aiCredits !== undefined" class="mt-4 p-4 border rounded-lg bg-purple-50">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-semibold text-purple-700">AI Credits</span>
              <p class="text-2xl font-bold text-purple-800">{{ tenantStore.tenant.aiCredits || 0 }}</p>
            </div>
            <i class="pi pi-sparkles text-3xl text-purple-300"></i>
          </div>
          <p class="text-xs text-purple-600 mt-1">Credits for AI-powered features (coming soon)</p>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="border border-red-200 rounded-lg p-5 bg-red-50">
        <h2 class="text-lg font-semibold text-red-800 mb-2">Danger Zone</h2>
        <p class="text-sm text-red-600 mb-4">These actions are irreversible. Proceed with caution.</p>
        <div class="flex gap-3">
          <Button label="Transfer Ownership" icon="pi pi-arrow-right-arrow-left" severity="danger" outlined disabled />
          <Button label="Delete Organization" icon="pi pi-trash" severity="danger" outlined disabled />
        </div>
        <p class="text-xs text-red-400 mt-2">Contact support to transfer ownership or delete your organization.</p>
      </div>
    </div>

    <div v-else class="py-8 text-center text-gray-500">
      <i class="pi pi-info-circle text-2xl mb-2"></i>
      <p>Tenant information not available.</p>
    </div>
  </div>
</template>
