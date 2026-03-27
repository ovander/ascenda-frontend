<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from 'vue-i18n'
import ProgressSpinner from 'primevue/progressspinner'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { handleCallback } = useAuth()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const code = route.query.code as string
    const state = route.query.state as string

    if (!code || !state) {
      error.value = 'Missing authorization code or state'
      return
    }

    await handleCallback(code, state)
    const redirect = sessionStorage.getItem('auth_redirect') || '/'
    sessionStorage.removeItem('auth_redirect')
    router.replace(redirect)
  } catch (err: any) {
    error.value = err.message || 'Authentication failed'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center" v-if="!error">
      <ProgressSpinner class="mb-4" />
      <p class="text-gray-600">{{ t('auth.loggingIn') }}</p>
    </div>
    <div class="text-center bg-white rounded-lg shadow-md p-8 max-w-md" v-else>
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
      <p class="text-gray-600 mb-4">{{ error }}</p>
      <router-link to="/login" class="text-primary-600 hover:underline">
        Return to login
      </router-link>
    </div>
  </div>
</template>
