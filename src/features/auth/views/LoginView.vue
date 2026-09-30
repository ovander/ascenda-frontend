<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const { t } = useI18n()
const { initiateLogin } = useAuth()
const route = useRoute()

// The backend sends the browser here with ?error= when a sign-in did not
// complete (cancelled at Socrate, expired or replayed callback).
const error = computed(() => {
  switch (route.query.error) {
    case undefined: return ''
    case 'access_denied': return t('auth.signInCancelled')
    default: return t('auth.signInFailed')
  }
})

function signIn() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  initiateLogin(redirect)
}

onMounted(() => {
  // ?auto=1 is set by the landing page "Sign in" link — skip the button and
  // go straight to sign-in, unless the last attempt just failed.
  if (route.query.auto === '1' && !error.value) {
    signIn()
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
      <div class="mb-6">
        <i class="pi pi-chart-bar text-5xl text-primary-600 mb-4"></i>
        <h1 class="text-3xl font-bold text-gray-800">{{ t('auth.loginTitle') }}</h1>
        <p class="text-gray-500 mt-2">{{ t('auth.loginSubtitle') }}</p>
      </div>
      <p v-if="error" class="text-red-600 mb-4" data-test="login-error">{{ error }}</p>
      <Button
        :label="t('auth.loginButton')"
        icon="pi pi-sign-in"
        class="w-full"
        size="large"
        data-test="login-button"
        @click="signIn"
      />
      <p class="text-xs text-gray-400 mt-6">
        Multi-Tenant SaaS Business Plan Application
      </p>
    </div>
  </div>
</template>
