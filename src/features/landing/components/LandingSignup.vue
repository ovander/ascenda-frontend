<template>
  <section id="signup" class="bg-white border-t border-slate-200 py-28">
    <div class="max-w-lg mx-auto px-6">

      <div class="text-center mb-10 reveal">
        <h2 class="font-display text-4xl font-bold tracking-tight mb-3 text-slate-900">
          Create your free account
        </h2>
        <p class="text-slate-600">No credit card. Up and running in minutes.</p>
      </div>

      <div class="bg-slate-50 rounded-2xl border border-slate-200 p-8 card-glow reveal">
        <form @submit.prevent="submit" class="space-y-5">

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1.5">First name</label>
              <input
                v-model="form.firstName"
                type="text"
                required
                placeholder="Marie"
                class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1.5">Last name</label>
              <input
                v-model="form.lastName"
                type="text"
                required
                placeholder="Dupont"
                class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1.5">Company name</label>
            <input
              v-model="form.companyName"
              type="text"
              required
              placeholder="Acme SAS"
              class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1.5">Work email</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="marie@acme.com"
              class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1.5">Country</label>
            <select
              v-model="form.country"
              class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors appearance-none focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="BE">Belgium</option>
              <option value="FR">France</option>
              <option value="LU">Luxembourg</option>
              <option value="NL">Netherlands</option>
              <option value="DE">Germany</option>
              <option value="GB">United Kingdom</option>
              <option value="CH">Switzerland</option>
              <option value="ES">Spain</option>
              <option value="IT">Italy</option>
              <option value="PT">Portugal</option>
              <option value="IE">Ireland</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {{ error }}
          </div>
          <div v-if="success" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            ✓ Account created! Check your email for your sign-in link.
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full accent-gradient text-white text-sm font-semibold px-6 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <span>{{ loading ? 'Creating account…' : 'Create free account' }}</span>
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </button>

          <p class="text-xs text-slate-500 text-center">
            By signing up you agree to our
            <a href="#" class="text-slate-600 hover:text-slate-800 underline">Terms of Service</a>
            and
            <a href="#" class="text-slate-600 hover:text-slate-800 underline">Privacy Policy</a>.
          </p>

        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Same-origin: Caddy routes /auth to the backend (the dev server proxies it).

const form = ref({
  firstName:   '',
  lastName:    '',
  companyName: '',
  email:       '',
  country:     'BE',
})

const loading = ref(false)
const error   = ref('')
const success = ref(false)

const submit = async () => {
  loading.value = true
  error.value   = ''
  success.value = false

  try {
    const res = await fetch(`/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form.value),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as any).message || 'Registration failed. Please try again.')
    }
    success.value = true
    form.value = { firstName: '', lastName: '', companyName: '', email: '', country: 'BE' }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
