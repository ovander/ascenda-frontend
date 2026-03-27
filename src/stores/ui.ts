import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const loading = ref(false)
  const loadingMessage = ref('')
  const toastMessages = ref<Array<{ severity: string; summary: string; detail: string; life?: number }>>([])

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setLoading(isLoading: boolean, message = '') {
    loading.value = isLoading
    loadingMessage.value = message
  }

  function showToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string = '', life = 3000) {
    toastMessages.value.push({ severity, summary, detail, life })
  }

  return {
    sidebarCollapsed,
    loading,
    loadingMessage,
    toastMessages,
    toggleSidebar,
    setLoading,
    showToast,
  }
})
