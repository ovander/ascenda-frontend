<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 md:mb-6">
    <div class="min-w-0">
      <h1 class="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">
        <slot name="title" />
      </h1>
      <p v-if="$slots.subtitle" class="text-gray-500 mt-0.5 text-sm">
        <slot name="subtitle" />
      </p>
    </div>
    <div v-if="$slots.actions" class="flex gap-2 shrink-0 flex-wrap items-center">
      <slot name="actions" />
    </div>
  </div>
</template>
