<template>
  <section id="pricing" class="bg-white py-28 border-y border-slate-100">
    <div class="max-w-7xl mx-auto px-6">

      <div class="text-center mb-16 reveal">
        <div class="inline-flex items-center gap-2 badge-pill text-xs font-medium px-4 py-1.5 rounded-full mb-4">
          Pricing
        </div>
        <h2 class="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
          Start free. Upgrade when you're ready.
        </h2>
        <p class="text-slate-600 text-lg">No contracts. Cancel any time.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

        <!-- Free -->
        <div class="bg-slate-50 rounded-2xl p-8 border border-slate-200 card-glow reveal flex flex-col">
          <div class="mb-6">
            <div class="text-sm font-medium text-slate-500 mb-1">Free</div>
            <div class="flex items-end gap-1 mb-3">
              <span class="text-4xl font-bold text-slate-900">€0</span>
              <span class="text-slate-500 text-sm mb-1.5">/month</span>
            </div>
            <p class="text-sm text-slate-600">For individuals and early-stage founders getting started.</p>
          </div>
          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in freeFeatures" :key="f.text" class="flex items-start gap-2.5 text-sm" :class="f.included ? 'text-slate-700' : 'text-slate-400'">
              <svg v-if="f.included" class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <svg v-else class="w-4 h-4 text-slate-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              {{ f.text }}
            </li>
          </ul>
          <a href="#signup" class="block text-center text-sm font-medium text-indigo-600 border border-indigo-300 hover:bg-indigo-50 px-6 py-3 rounded-xl transition-colors">
            Get started free
          </a>
        </div>

        <!-- Pro (highlighted) -->
        <div class="bg-white rounded-2xl p-8 border-2 border-indigo-500 card-glow-pro reveal flex flex-col relative">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span class="accent-gradient text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">Most popular</span>
          </div>
          <div class="mb-6">
            <div class="text-sm font-medium text-indigo-600 mb-1">Pro</div>
            <div class="flex items-end gap-1 mb-3">
              <span class="text-4xl font-bold text-slate-900">€49</span>
              <span class="text-slate-500 text-sm mb-1.5">/month</span>
            </div>
            <p class="text-sm text-slate-600">For scaling teams that need deeper financial intelligence.</p>
          </div>
          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in proFeatures" :key="f" class="flex items-start gap-2.5 text-sm text-slate-700">
              <svg class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ f }}
            </li>
          </ul>
          <a href="#signup" class="block text-center text-sm font-semibold accent-gradient text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
            Start Pro trial — 14 days free
          </a>
        </div>

        <!-- Enterprise -->
        <div class="bg-slate-50 rounded-2xl p-8 border border-slate-200 card-glow reveal flex flex-col">
          <div class="mb-6">
            <div class="text-sm font-medium text-slate-500 mb-1">Enterprise</div>
            <div class="flex items-end gap-1 mb-3">
              <span class="text-4xl font-bold text-slate-900">Custom</span>
            </div>
            <p class="text-sm text-slate-600">For finance teams and multi-entity organisations.</p>
          </div>
          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in enterpriseFeatures" :key="f" class="flex items-start gap-2.5 text-sm text-slate-700">
              <svg class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ f }}
            </li>
          </ul>
          <a href="mailto:sales@ascenda.io" class="block text-center text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 px-6 py-3 rounded-xl transition-colors">
            Contact sales
          </a>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const freeFeatures = [
  { text: 'Up to 2 plans',              included: true  },
  { text: '5-year financial forecast',  included: true  },
  { text: 'Products, staff, capex, opex', included: true },
  { text: 'Snapshot history',           included: true  },
  { text: 'Break-Even analysis',        included: false },
  { text: 'Cap Table management',       included: false },
]

const proFeatures = [
  'Unlimited plans & scenarios',
  'Everything in Free',
  'Break-Even & sensitivity analysis',
  'Cap Table management',
  'Cost optimisation plans',
  'AI narration & assumption review',
  'Unit economics & driver advisor',
  'Priority support',
]

const enterpriseFeatures = [
  'Everything in Pro',
  'Multi-entity consolidation',
  'SSO & advanced RBAC',
  'Dedicated onboarding & CSM',
  'SLA & uptime guarantee',
  'Custom integrations & API access',
  'AI Investor Memo generation',
]
</script>
