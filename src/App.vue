<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'

const { locale } = useI18n()
const settingsStore = useSettingsStore()

// Keep vue-i18n locale in sync with the plan's language setting.
// immediate: true ensures the locale is set as soon as a plan is active on load.
// Note: `lang ?? 'fr'` (no if-guard) ensures the locale resets to the default
// when config is cleared (e.g. on plan switch), preventing a stale locale.
watch(
  () => settingsStore.config?.language,
  (lang) => { locale.value = (lang ?? 'fr') as 'fr' | 'en' },
  { immediate: true },
)
</script>

<template>
  <router-view />
</template>
