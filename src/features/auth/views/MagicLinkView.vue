<script setup lang="ts">
/**
 * MagicLinkView — landing page of the sign-in link Socrate e-mails
 * (/magic-link?token=…&client_id=…, the magic-link URL configured on the
 * Socrate application). It redeems the single-use token through the backend,
 * which answers like the OAuth callback, then opens the page the user was
 * heading to. The token is posted, never fetched with GET, so link scanners
 * that open e-mailed URLs cannot spend it.
 */
import { onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ProgressSpinner from 'primevue/progressspinner'
import { useAuthStore } from '@/stores/auth'
import { takePostLoginRedirect } from '@/features/auth/utils/postLoginRedirect'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  // Keep the single-use token out of the history and of any Referer header.
  window.history.replaceState(window.history.state, '', route.path)

  if (!token) {
    error.value = t('auth.magicLinkInvalid')
    return
  }
  try {
    await auth.magicLink(token)
    router.replace(takePostLoginRedirect())
  } catch (err) {
    const status = isAxiosError(err) ? err.response?.status : undefined
    error.value = status === 401 ? t('auth.magicLinkInvalid') : t('auth.magicLinkFailed')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center" v-if="!error">
      <ProgressSpinner class="mb-4" />
      <p class="text-gray-600">{{ t('auth.loggingIn') }}</p>
    </div>
    <div class="text-center bg-white rounded-lg shadow-md p-8 max-w-md" v-else data-test="magic-link-error">
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
      <p class="text-gray-600 mb-4">{{ error }}</p>
      <router-link to="/landing#login" class="text-primary-600 hover:underline">
        {{ t('auth.magicLinkRequestNew') }}
      </router-link>
    </div>
  </div>
</template>
