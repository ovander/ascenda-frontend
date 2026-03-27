<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Line, Radar } from 'vue-chartjs'
import type { ChartData } from '@/types'
import '@/plugins/chartjs'
import {
  PALETTE_BG,
  PALETTE_BORDER,
  DEFAULT_BAR_OPTIONS,
  DEFAULT_LINE_OPTIONS,
  DEFAULT_STACKED_BAR_OPTIONS,
} from '@/plugins/chartjs'

export type ChartType = 'bar' | 'line' | 'stacked-bar' | 'radar' | 'area' | 'combo'

const props = withDefaults(
  defineProps<{
    data: ChartData | null
    type?: ChartType
    height?: string
    title?: string
    loading?: boolean
    yMax?: number
    yMin?: number
  }>(),
  {
    type: 'bar',
    height: '320px',
    loading: false,
  }
)

// Transform API ChartData into vue-chartjs format with auto-coloring
// Using 'any' to avoid complex Chart.js generic type gymnastics
const chartData = computed<any>(() => {
  if (!props.data) {
    return { labels: [], datasets: [] }
  }

  const datasets = props.data.datasets.map((ds, i) => {
    const isLine = ds.type === 'line' || props.type === 'line' || props.type === 'area'
    return {
      ...ds,
      backgroundColor: ds.backgroundColor || (isLine ? 'transparent' : PALETTE_BG[i % PALETTE_BG.length]),
      borderColor: ds.borderColor || PALETTE_BORDER[i % PALETTE_BORDER.length],
      borderWidth: 2,
      fill: props.type === 'area' ? true : (ds.type === 'line' ? false : undefined),
      tension: isLine ? 0.3 : undefined,
      pointRadius: isLine ? 4 : undefined,
      pointHoverRadius: isLine ? 6 : undefined,
    }
  })

  return {
    labels: props.data.labels,
    datasets,
  }
})

const chartOptions = computed<any>(() => {
  // Build optional Y-axis overrides from yMin / yMax props
  const yOverride: Record<string, any> = {}
  if (props.yMin !== undefined) yOverride.min = props.yMin
  if (props.yMax !== undefined) yOverride.max = props.yMax

  const withY = (base: any) => {
    if (Object.keys(yOverride).length === 0) return base
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales?.y, ...yOverride },
      },
    }
  }

  switch (props.type) {
    case 'stacked-bar':
      return withY({ ...DEFAULT_STACKED_BAR_OPTIONS })
    case 'line':
    case 'area':
      return withY({ ...DEFAULT_LINE_OPTIONS })
    case 'radar':
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const } },
      }
    case 'combo':
      return withY({
        ...DEFAULT_BAR_OPTIONS,
        scales: {
          x: { stacked: false },
          y: { beginAtZero: true },
        },
      })
    default:
      return withY({ ...DEFAULT_BAR_OPTIONS })
  }
})

const chartComponent = computed(() => {
  if (props.type === 'radar') return Radar
  if (props.type === 'line' || props.type === 'area') return Line
  return Bar
})
</script>

<template>
  <div class="kchart-wrapper" :style="{ height }">
    <h3 v-if="title" class="text-lg font-semibold text-gray-800 mb-3">{{ title }}</h3>

    <div v-if="loading" class="w-full h-full flex items-center justify-center bg-gray-50 rounded border border-gray-200">
      <span class="text-gray-400 animate-pulse">Loading chart data...</span>
    </div>

    <div v-else-if="!data || data.datasets.length === 0" class="w-full h-full flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
      <span class="text-gray-400">No chart data available</span>
    </div>

    <div v-else class="w-full h-full">
      <component :is="chartComponent" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.kchart-wrapper {
  position: relative;
}

.kchart-wrapper canvas {
  max-height: 100%;
}
</style>
