<script setup lang="ts">
/**
 * BuildInfoPanel.vue — version, commit, build time and toolchain of the
 * application (this frontend bundle) and of the server (the backend API),
 * side by side, with a button that copies both as text for support requests.
 * Used by the About dialog (every user) and the admin dashboard.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { formatBuildInfo, useBuildInfo, type BuildInfo } from '@/composables/useBuildInfo'

const { t, locale } = useI18n()
const { frontend, backend, backendError, loadBackend } = useBuildInfo()

onMounted(loadBackend)

const sides = computed(() => [
  { key: 'frontend', title: t('about.frontend'), icon: 'pi-desktop', info: frontend as BuildInfo | null },
  { key: 'backend', title: t('about.backend'), icon: 'pi-server', info: backend.value },
])

function formatTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
}

const copied = ref(false)
async function copy() {
  const lines = [formatBuildInfo(t('about.frontend'), frontend)]
  lines.push(backend.value
    ? formatBuildInfo(t('about.backend'), backend.value)
    : `${t('about.backend')}: ${t('about.unavailable')}`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard unavailable (insecure context, permission denied): nothing to do.
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <section
        v-for="side in sides"
        :key="side.key"
        class="rounded-lg border border-gray-200 bg-white p-4"
        :data-test="`build-${side.key}`"
      >
        <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <i :class="['pi', side.icon, 'text-gray-400']"></i>
          {{ side.title }}
        </h3>

        <dl v-if="side.info" class="build-grid">
          <dt>{{ t('about.version') }}</dt>
          <dd class="font-semibold text-gray-900" data-test="version">{{ side.info.version || '—' }}</dd>
          <dt>{{ t('about.commit') }}</dt>
          <dd class="font-mono" data-test="commit">{{ side.info.commit || '—' }}</dd>
          <dt>{{ t('about.built') }}</dt>
          <dd data-test="built">{{ formatTime(side.info.buildTime) }}</dd>
          <dt>{{ t('about.toolchain') }}</dt>
          <dd data-test="toolchain">
            <span v-for="(tool, i) in side.info.toolchain" :key="tool.name">
              {{ tool.name }} <span class="font-mono">{{ tool.version }}</span><span v-if="i < side.info.toolchain.length - 1"> · </span>
            </span>
          </dd>
        </dl>
        <p v-else-if="backendError" class="text-sm text-red-600" data-test="unavailable">
          {{ t('about.unavailable') }}
          <Button :label="t('about.retry')" link size="small" class="p-0 ml-1" @click="loadBackend" />
        </p>
        <p v-else class="text-sm text-gray-400">{{ t('common.loading') }}</p>
      </section>
    </div>

    <div class="flex justify-end">
      <Button
        :label="copied ? t('about.copied') : t('about.copy')"
        :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
        severity="secondary"
        outlined
        size="small"
        data-test="copy"
        @click="copy"
      />
    </div>
  </div>
</template>

<style scoped>
.build-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  font-size: 0.85rem;
}
.build-grid dt { color: #6b7280; }
.build-grid dd { margin: 0; color: #374151; overflow-wrap: anywhere; }
</style>
