<script setup lang="ts">
/**
 * KFieldLabel — a form field label with an optional inline tooltip.
 *
 * Usage:
 *   <KFieldLabel label="VAT Rate (%)" tooltip="Standard VAT rate applied to domestic sales." />
 *
 * The ℹ icon appears right after the label text and shows the tooltip on hover.
 * Wraps a native <label> so clicking it still focuses the associated input when
 * a `for` prop is provided.
 */
defineProps<{
  label:    string
  tooltip?: string
  for?:     string
}>()
</script>

<template>
  <label
    :for="$props.for"
    class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1 select-none"
  >
    <span>{{ label }}</span>
    <i
      v-if="tooltip"
      class="pi pi-info-circle text-gray-400 hover:text-blue-500 cursor-help text-xs transition-colors"
      v-tooltip.top="{ value: tooltip, showDelay: 200, hideDelay: 100 }"
    />
  </label>
</template>
