<template>
  <nav class="nav-blur fixed top-0 left-0 right-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

      <!-- Logo -->
      <a href="#" class="flex items-center no-underline">
        <img src="/logo.png" alt="Ascenda" style="height:32px;width:auto;" />
      </a>

      <!-- Nav links (desktop) -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
        <a href="#ai"       class="text-sm text-slate-600 hover:text-slate-900 transition-colors">AI</a>
        <a href="#pricing"  class="text-sm text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
        <a href="#faq"      class="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
      </div>

      <!-- CTA buttons -->
      <div class="flex items-center gap-3">
        <button
          @click="goLogin"
          class="text-sm text-slate-700 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
        >
          Sign in
        </button>
        <a
          href="#signup"
          class="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Start free
        </a>
      </div>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()

const goLogin = () => {
  const redirect = (route.query.redirect as string) || '/'
  router.push(`/login?redirect=${encodeURIComponent(redirect)}`)
}
</script>
