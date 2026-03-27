import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type DisplayUnit = '€' | 'k€' | 'M€'

const STORAGE_KEY = 'ascenda_display_unit'

export const useDisplayUnitStore = defineStore('displayUnit', () => {
  const unit = ref<DisplayUnit>(
    (localStorage.getItem(STORAGE_KEY) as DisplayUnit) || 'k€',
  )

  /** Divisor to apply to raw base-€ values before rendering */
  const factor = computed((): number => {
    switch (unit.value) {
      case '€':  return 1
      case 'k€': return 1_000
      case 'M€': return 1_000_000
    }
  })

  /** Decimal places to use for the current unit */
  const decimals = computed((): number => {
    switch (unit.value) {
      case '€':  return 0
      case 'k€': return 1
      case 'M€': return 2
    }
  })

  function setUnit(u: DisplayUnit) {
    unit.value = u
    localStorage.setItem(STORAGE_KEY, u)
  }

  function cycleUnit() {
    const order: DisplayUnit[] = ['€', 'k€', 'M€']
    const idx = order.indexOf(unit.value)
    setUnit(order[(idx + 1) % order.length])
  }

  return { unit, factor, decimals, setUnit, cycleUnit }
})
