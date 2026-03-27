<script setup lang="ts">
import { computed } from 'vue'
import { useTierGate } from '@/composables/useTierGate'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const { upgradeVisible, upgradeFeatureName, upgradeTargetTier, hideUpgradeModal } = useTierGate()

const isEnterprise = computed(() => upgradeTargetTier.value === 'enterprise')

const tierLabel = computed(() => isEnterprise.value ? 'Enterprise' : 'Pro')

const tierColour = computed(() =>
  isEnterprise.value
    ? { ring: 'bg-violet-100', icon: 'text-violet-500', badge: 'text-violet-600' }
    : { ring: 'bg-amber-100', icon: 'text-amber-500', badge: 'text-amber-600' },
)

const upgradeButtonClass = computed(() =>
  isEnterprise.value
    ? 'bg-violet-600 hover:bg-violet-700 border-violet-600'
    : 'bg-amber-500 hover:bg-amber-600 border-amber-500',
)
</script>

<template>
  <Dialog
    v-model:visible="upgradeVisible"
    :header="undefined"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full max-w-md"
    @hide="hideUpgradeModal"
  >
    <div class="text-center px-2 py-4">
      <!-- Icon -->
      <div
        :class="['flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4', tierColour.ring]"
      >
        <i :class="['pi pi-lock text-2xl', tierColour.icon]"></i>
      </div>

      <!-- Title -->
      <h2 class="text-xl font-bold text-gray-800 mb-2">
        {{ tierLabel }} Feature
      </h2>

      <!-- Body -->
      <p class="text-gray-600 mb-1">
        <span class="font-semibold text-gray-800">{{ upgradeFeatureName }}</span>
        is available on the
        <span :class="['font-semibold', tierColour.badge]">{{ tierLabel }}</span>
        plan{{ isEnterprise ? '' : ' and above' }}.
      </p>

      <!-- Pro description -->
      <p v-if="!isEnterprise" class="text-sm text-gray-500 mb-6">
        Upgrade to unlock break-even analysis, cap table management, AI-powered
        financial intelligence, and more advanced financial tools.
      </p>

      <!-- Enterprise description -->
      <p v-else class="text-sm text-gray-500 mb-6">
        Contact us to unlock investor-grade reports, dedicated support, and
        unlimited AI analysis across all features.
      </p>

      <!-- Pro feature highlights -->
      <ul v-if="!isEnterprise" class="text-left text-sm text-gray-600 space-y-2 mb-6 bg-gray-50 rounded-lg p-4">
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Break-Even Point &amp; Sensitivity Analysis
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Cap Table &amp; Shareholder Management
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          AI-powered driver analysis, benchmarks &amp; unit economics
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Unlimited plans &amp; scenarios
        </li>
      </ul>

      <!-- Enterprise feature highlights -->
      <ul v-else class="text-left text-sm text-gray-600 space-y-2 mb-6 bg-violet-50 rounded-lg p-4">
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Full Investor Memo generation
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Unlimited AI analysis &amp; no daily caps
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Priority support &amp; dedicated onboarding
        </li>
        <li class="flex items-center gap-2">
          <i class="pi pi-check-circle text-green-500 shrink-0"></i>
          Custom integrations &amp; SLA
        </li>
      </ul>

      <!-- Actions -->
      <div class="flex gap-3 justify-center">
        <Button
          label="Maybe later"
          severity="secondary"
          text
          @click="hideUpgradeModal"
        />
        <Button
          :label="isEnterprise ? 'Contact Sales' : 'Upgrade to Pro'"
          icon="pi pi-arrow-up"
          :class="upgradeButtonClass"
          @click="hideUpgradeModal"
        />
      </div>
    </div>
  </Dialog>
</template>
