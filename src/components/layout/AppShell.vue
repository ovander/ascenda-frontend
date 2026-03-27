<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import UpgradeModal from '@/components/common/UpgradeModal.vue'
import { useUiStore } from '@/stores/ui'
import { useTenantStore } from '@/stores/tenant'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const ui = useUiStore()
const toast = useToast()
const tenantStore = useTenantStore()

// Load tenant on mount so tier-gating works throughout the app.
onMounted(() => {
  tenantStore.fetchTenant()
})

watch(() => ui.toastMessages, (messages) => {
  if (messages.length > 0) {
    const msg = messages.pop()
    if (msg) toast.add(msg)
  }
}, { deep: true })
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 min-w-[768px]">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <AppTopbar />
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
    <Toast position="top-right" />
    <UpgradeModal />
  </div>
</template>
