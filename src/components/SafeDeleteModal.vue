<script setup lang="ts">
/**
 * SafeDeleteModal — cross-cutting safe-delete pattern (Section 11.5 of the UX proposal).
 *
 * Displays an impact preview before any destructive action. The user must either:
 *  - type the entity name in the confirmation input (when confirmName is provided), or
 *  - click the destructive action button (when no confirmName is required)
 *
 * The component does NOT perform the deletion itself — it emits `confirm` and
 * the parent handles the actual API call.
 *
 * Usage:
 *   <SafeDeleteModal
 *     v-model:visible="showDelete"
 *     entity-type="Plan"
 *     :entity-name="plan.name"
 *     :impact-lines="['3 scenarios', '280 staff records', '1 cap table']"
 *     :loading="deleting"
 *     @confirm="doDelete"
 *   />
 */
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const props = withDefaults(defineProps<{
  /** Controls dialog visibility (v-model:visible) */
  visible: boolean
  /** Human-readable entity type, e.g. "Plan", "User", "Scenario" */
  entityType: string
  /** Display name of the entity being deleted */
  entityName: string
  /**
   * List of impact lines shown in the preview panel.
   * Each string is rendered as a bullet point.
   * e.g. ['3 scenarios', '280 staff records', '1 FiPlan link']
   */
  impactLines?: string[]
  /**
   * Optional warning message shown above the impact list.
   * Use for non-countable warnings, e.g. "This plan is shared with investors."
   */
  warningMessage?: string
  /**
   * When true, the user must type the entity name before confirming.
   * For low-risk deletes (e.g. a single small record) you may omit this.
   */
  requireNameConfirm?: boolean
  /** Shows a spinner on the confirm button while the API call is in progress */
  loading?: boolean
  /**
   * When true, the action is blocked entirely (e.g. last scenario, demo plan).
   * The confirm button is hidden and `blockedReason` is shown instead.
   */
  blocked?: boolean
  /** Reason displayed when `blocked` is true */
  blockedReason?: string
  /** Label for the destructive action button */
  actionLabel?: string
}>(), {
  impactLines: () => [],
  requireNameConfirm: true,
  loading: false,
  blocked: false,
  actionLabel: 'Delete permanently',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}>()

const nameInput = ref('')

const nameMatches = computed(() =>
  !props.requireNameConfirm || nameInput.value.trim() === props.entityName.trim()
)

const canConfirm = computed(() => !props.blocked && nameMatches.value && !props.loading)

function close() {
  nameInput.value = ''
  emit('update:visible', false)
}

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm')
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="close"
    :header="`Delete ${entityType}`"
    :style="{ width: '480px' }"
    modal
    :closable="!loading"
  >
    <div class="space-y-4 pt-1">

      <!-- Blocked state -->
      <div v-if="blocked" class="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <i class="pi pi-exclamation-triangle text-orange-500 text-xl mt-0.5 flex-shrink-0"></i>
          <div>
            <p class="font-semibold text-orange-800 text-sm">Cannot delete this {{ entityType.toLowerCase() }}</p>
            <p class="text-orange-700 text-sm mt-1">{{ blockedReason }}</p>
          </div>
        </div>
      </div>

      <!-- Warning banner (optional) -->
      <div v-else-if="warningMessage" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p class="text-yellow-800 text-sm">
          <i class="pi pi-info-circle mr-1"></i>
          {{ warningMessage }}
        </p>
      </div>

      <!-- Entity name + impact summary -->
      <div v-if="!blocked">
        <p class="text-sm text-gray-600 mb-3">
          You are about to permanently delete
          <span class="font-semibold text-gray-900">{{ entityName }}</span>.
          This action cannot be undone.
        </p>

        <!-- Impact list -->
        <div v-if="impactLines.length > 0" class="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What will be deleted</p>
          <ul class="space-y-1">
            <li
              v-for="line in impactLines"
              :key="line"
              class="flex items-center gap-2 text-sm text-gray-700"
            >
              <i class="pi pi-trash text-red-400 text-xs"></i>
              {{ line }}
            </li>
          </ul>
        </div>

        <!-- Name confirmation input -->
        <div v-if="requireNameConfirm" class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">
            Type <span class="font-mono bg-gray-100 px-1 rounded text-red-700">{{ entityName }}</span> to confirm
          </label>
          <InputText
            v-model="nameInput"
            class="w-full"
            :placeholder="entityName"
            :disabled="loading"
            @keydown.enter="handleConfirm"
          />
          <p v-if="nameInput.length > 0 && !nameMatches" class="text-xs text-red-600">
            Name does not match — please type exactly: <strong>{{ entityName }}</strong>
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          text
          severity="secondary"
          @click="close"
          :disabled="loading"
        />
        <Button
          v-if="!blocked"
          :label="actionLabel"
          icon="pi pi-trash"
          severity="danger"
          :loading="loading"
          :disabled="!canConfirm"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>
