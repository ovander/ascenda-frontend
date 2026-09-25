import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type DisplayUnit = '€' | 'k€' | 'M€'

const STORAGE_KEY = 'ascenda_display_unit'

const FACTORS: Record<DisplayUnit, number> = { '€': 1, 'k€': 1_000, 'M€': 1_000_000 }
const DECIMALS: Record<DisplayUnit, number> = { '€': 0, 'k€': 1, 'M€': 2 }

export const useDisplayUnitStore = defineStore('displayUnit', () => {
  const unit = ref<DisplayUnit>(
    (localStorage.getItem(STORAGE_KEY) as DisplayUnit) || 'k€',
  )

  /** Divisor to apply to raw base-€ values before rendering */
  const factor = computed((): number => FACTORS[unit.value])

  /** Decimal places to use for the current unit */
  const decimals = computed((): number => DECIMALS[unit.value])

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
