<script setup lang="ts">
/**
 * KFormLegend — a compact legend bar shown at the top of forms and data grids.
 *
 * Two variants:
 *   - "form"  (default) — explains input conventions: %, k amounts, computed fields.
 *   - "grid"  — explains KYearGrid colour coding: orange = input, green = computed,
 *               bold/grey = aggregate row.
 *
 * The optional `description` prop renders a short module-purpose sentence above
 * the legend chips.
 *
 * Extra legend items can be appended via the `extras` prop in both variants.
 *
 * Usage:
 *   <KFormLegend description="Enter your 5-year revenue forecasts below." />
 *   <KFormLegend variant="grid" description="Editable rows are shown in orange." />
 *   <KFormLegend :extras="[{ color: '#bfdbfe', text: 'Highlighted rows' }]" />
 */

withDefaults(defineProps<{
  variant?:     'form' | 'grid'
  description?: string
  extras?:      { icon?: string; color?: string; text: string }[]
}>(), {
  variant: 'form',
})

const FORM_ITEMS: { icon?: string; color?: string; text: string }[] = [
  { icon: 'pi-percentage', text: 'Percentage fields — enter as percentage points (e.g. 25 for 25 %)' },
  { icon: 'pi-dollar',     text: 'Amount fields — values are in thousands of your currency unit (k)' },
  { icon: 'pi-calculator', text: 'Green fields are read-only, computed automatically from your inputs' },
]

const GRID_ITEMS: { icon?: string; color?: string; text: string }[] = [
  { color: '#fed7aa', text: 'Orange cell — enter your value here' },
  { color: '#dcfce7', text: 'Green cell — automatically computed' },
  { color: '#f3f4f6', text: 'Grey row — aggregate / total (read-only)' },
]
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 mb-4 space-y-1.5">
    <!-- Optional module description -->
    <p v-if="description" class="text-xs text-gray-600 leading-snug">
      {{ description }}
    </p>

    <!-- Legend chips -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span class="text-xs font-semibold text-gray-500 shrink-0">Legend:</span>

      <!-- Form variant -->
      <template v-if="variant === 'form'">
        <span
          v-for="item in [...FORM_ITEMS, ...(extras ?? [])]"
          :key="item.text"
          class="flex items-center gap-1 text-xs text-gray-500"
        >
          <i v-if="item.icon" :class="`pi ${item.icon} text-gray-400 text-[10px]`" />
          <span
            v-else-if="item.color"
            class="inline-block w-3 h-3 rounded-xs border border-gray-300 shrink-0"
            :style="{ background: item.color }"
          />
          {{ item.text }}
        </span>
      </template>

      <!-- Grid variant -->
      <template v-else>
        <span
          v-for="item in [...GRID_ITEMS, ...(extras ?? [])]"
          :key="item.text"
          class="flex items-center gap-1.5 text-xs text-gray-500"
        >
          <i v-if="item.icon" :class="`pi ${item.icon} text-gray-400 text-[10px]`" />
          <span
            v-else-if="item.color"
            class="inline-block w-3 h-3 rounded-xs border border-gray-300 shrink-0"
            :style="{ background: item.color }"
          />
          {{ item.text }}
        </span>
      </template>
    </div>
  </div>
</template>
