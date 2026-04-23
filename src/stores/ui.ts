import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type UiLayer = 'operate' | 'understand'

// Breakpoints mirror Tailwind's defaults.
const BP_MD = 768   // tablet and up  (iPad portrait)
const BP_LG = 1024  // desktop and up (iPad landscape)

export const useUiStore = defineStore('ui', () => {
  // ── Screen size ───────────────────────────────────────────────────────────
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)

  const isMobile  = computed(() => windowWidth.value < BP_MD)
  const isTablet  = computed(() => windowWidth.value >= BP_MD && windowWidth.value < BP_LG)
  const isDesktop = computed(() => windowWidth.value >= BP_LG)

  /** On phones, the app is read-only: all data-entry (operate-layer) routes are blocked. */
  const canEdit = computed(() => !isMobile.value)

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth
      // Auto-collapse when entering tablet range
      if (windowWidth.value >= BP_MD && windowWidth.value < BP_LG && !sidebarCollapsed.value) {
        sidebarCollapsed.value = true
      }
      // Close mobile drawer when resizing up past mobile
      if (windowWidth.value >= BP_MD) {
        mobileDrawerOpen.value = false
      }
    }, { passive: true })

    // E2E test hook: allows Playwright to directly set windowWidth for responsive tests.
    // Only active in test/development environments (not in production).
    if (import.meta.env.DEV || (window as any).__E2E_AUTH__) {
      ;(window as any).__setWindowWidth = (w: number) => { windowWidth.value = w }
    }
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  // Desktop/tablet: collapsed = icon-only (w-16) vs expanded (w-64)
  // Mobile: mobileDrawerOpen controls the slide-in overlay; sidebarCollapsed unused
  const sidebarCollapsed = ref(false)
  const mobileDrawerOpen = ref(false)

  function toggleSidebar() {
    if (isMobile.value) {
      mobileDrawerOpen.value = !mobileDrawerOpen.value
    } else {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
  }

  function closeDrawer() {
    mobileDrawerOpen.value = false
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  const loading = ref(false)
  const loadingMessage = ref('')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toastMessages = ref<Array<{ severity: string; summary: string; detail: string; life?: number }>>([])

  // ── Dual-layer UX (OPERATE / UNDERSTAND) ─────────────────────────────────
  const activeLayer = ref<UiLayer>('operate')

  function setLayer(layer: UiLayer) {
    activeLayer.value = layer
  }

  function setLoading(isLoading: boolean, message = '') {
    loading.value = isLoading
    loadingMessage.value = message
  }

  function showToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string = '', life = 3000) {
    toastMessages.value.push({ severity, summary, detail, life })
  }

  return {
    // screen
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    canEdit,
    // sidebar
    sidebarCollapsed,
    mobileDrawerOpen,
    toggleSidebar,
    closeDrawer,
    // loading
    loading,
    loadingMessage,
    setLoading,
    // toast
    toastMessages,
    showToast,
    // layer
    activeLayer,
    setLayer,
  }
})
