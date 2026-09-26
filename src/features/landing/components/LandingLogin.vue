<template>
  <section id="login" class="bg-slate-50 border-t border-slate-200 py-20">
    <div class="max-w-md mx-auto px-6">

      <div class="text-center mb-8 reveal">
        <h2 class="font-display text-3xl font-bold tracking-tight mb-2 text-slate-900">Welcome back</h2>
        <p class="text-slate-600 text-sm">Sign in to your Ascenda workspace.</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-8 card-glow reveal">
        <form @submit.prevent="submit" class="space-y-5">

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1.5">Work email</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="you@company.com"
              class="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {{ error }}
          </div>
          <div v-if="success" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            ✓ Magic link sent! Check your inbox.
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full text-sm font-semibold text-indigo-700 border border-indigo-300 hover:bg-indigo-50 px-6 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <span>{{ loading ? 'Sending…' : 'Send magic link' }}</span>
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </button>

          <p class="text-xs text-center text-slate-500">
            No password needed — we'll email you a secure link.
          </p>

        </form>

        <div class="mt-6 pt-6 border-t border-slate-200 text-center">
          <p class="text-sm text-slate-600">
            Don't have an account yet?
            <a href="#signup" class="text-indigo-600 hover:text-indigo-700 font-medium ml-1">Sign up free</a>
          </p>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const email   = ref('')
const loading = ref(false)
const error   = ref('')
const success = ref(false)
const route   = useRoute()

const submit = async () => {
  loading.value = true
  error.value   = ''
  success.value = false

  try {
    const res = await fetch('/auth/magic-link', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:    email.value,
        redirect: (route.query.redirect as string) || '/',
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as any).message || 'Could not send link. Please try again.')
    }
    success.value = true
    email.value   = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
