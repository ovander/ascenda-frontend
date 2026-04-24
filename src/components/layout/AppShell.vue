<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import MobileReadOnlyBanner from './MobileReadOnlyBanner.vue'
import UpgradeModal from '@/components/common/UpgradeModal.vue'
import { useUiStore } from '@/stores/ui'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const ui = useUiStore()
const toast = useToast()
const tenantStore = useTenantStore()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const route = useRoute()

/**
 * Returns true when it is safe to render the router-view.
 *
 * We delay rendering on scenario routes until the settings config is loaded so
 * that the App.vue locale watcher can apply the correct language *before* any
 * view renders — preventing the FR→EN (or EN→FR) flicker that was visible
 * when navigating between plans with different language settings.
 *
 * Special cases that bypass the guard:
 *  • Non-scenario routes  (no `sid` param at all)
 *  • Wizard "new" route   (sid === 'new') — no existing settings to fetch
 *  • Any non-UUID sid     (defensive; real scenario IDs are always UUIDs)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const settingsGuardReady = computed(() => {
  const sid = route.params.sid as string | undefined
  // No scenario context → always render
  if (!sid) return true
  // Wizard / new-scenario routes don't have an existing config to wait for
  if (!UUID_RE.test(sid)) return true
  // Real scenario route: wait for settings to load
  if (settingsStore.config) return true
  return false
})

// Auto-collapse sidebar on tablet on first mount
onMounted(() => {
  auth.fetchMe()
  if (auth.user?.role !== 'admin') {
    tenantStore.fetchTenant()
  }
  if (ui.isTablet) {
    ui.sidebarCollapsed = true
  }
})

watch(() => ui.toastMessages, (messages) => {
  if (messages.length > 0) {
    const msg = messages.pop()
    if (msg) toast.add(msg)
  }
}, { deep: true })

/**
 * Eagerly fetch settings whenever we enter a real scenario route (UUID sid).
 * This ensures the locale guard can resolve without waiting for a child view to mount.
 * Skips non-UUID values like 'new' (wizard) where no settings exist yet.
 */
watch(
  () => route.params.sid,
  (sid) => {
    if (sid && UUID_RE.test(sid as string)) {
      settingsStore.fetchConfig()
    }
  },
  { immediate: true },
)
</script>

<template>
  <!--
    Layout breakpoints:
    - Mobile  (< 768px) : sidebar is a fixed slide-in drawer overlay
    - Tablet  (768–1023): sidebar visible but collapsed to icons (w-16)
    - Desktop (≥ 1024px): full sidebar, user-controlled collapse
  -->
  <div class="flex h-screen overflow-hidden bg-gray-50">

    <!-- Mobile backdrop — closes drawer when tapping outside -->
    <transition name="fade">
      <div
        v-if="ui.isMobile && ui.mobileDrawerOpen"
        class="fixed inset-0 bg-black/40 z-30 md:hidden"
        @click="ui.closeDrawer()"
      />
    </transition>

    <!-- Sidebar: drawer on mobile, inline on tablet/desktop -->
    <div
      :class="[
        'z-40 transition-transform duration-300 ease-in-out',
        ui.isMobile
          ? 'fixed inset-y-0 left-0 ' + (ui.mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full')
          : 'relative translate-x-0',
      ]"
    >
      <AppSidebar />
    </div>

    <!-- Main content -->
    <div class="flex flex-col flex-1 overflow-hidden min-w-0">
      <AppTopbar />
      <MobileReadOnlyBanner />
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <template v-if="settingsGuardReady">
          <router-view />
        </template>
        <div v-else class="flex items-center justify-center h-full">
          <i class="pi pi-spin pi-spinner text-3xl text-gray-400" />
        </div>
      </main>
    </div>

    <Toast position="top-right" />
    <UpgradeModal />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
