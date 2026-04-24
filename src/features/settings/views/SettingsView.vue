<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import PlanConfigForm from '../components/PlanConfigForm.vue'
import OpeningBalanceForm from '../components/OpeningBalanceForm.vue'
import WorkingCapitalForm from '../components/WorkingCapitalForm.vue'
import OpexPerHireForm from '../components/OpexPerHireForm.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import { usePlanAccess } from '@/composables/usePlanAccess'

defineProps<{ planId?: string; sid?: string }>()
const { t } = useI18n()
const { canEdit } = usePlanAccess()

const settingsStore = useSettingsStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const activeTab = ref('config')

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await settingsStore.fetchAll()
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-4">{{ t('settings.title') }}</h1>
    <div v-if="!canEdit" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
      <i class="pi pi-eye"></i>
      <span>{{ t('settings.readOnlyAccess') }}</span>
    </div>
    <div v-if="settingsStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <Tabs v-else :value="activeTab" @update:value="(v: any) => activeTab = v">
      <TabList>
        <Tab value="config">{{ t('settings.tab.config') }}</Tab>
        <Tab value="opening">{{ t('settings.tab.opening') }}</Tab>
        <Tab value="wc">{{ t('settings.tab.wc') }}</Tab>
        <Tab value="opex-params">{{ t('settings.tab.opexParams') }}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="config">
          <PlanConfigForm v-if="settingsStore.config" :key="settingsStore.config.id" />
          <div v-else class="py-8 text-center text-gray-500">
            <i class="pi pi-info-circle text-2xl mb-2"></i>
            <p>{{ t('settings.notAvailable') }}</p>
          </div>
        </TabPanel>
        <TabPanel value="opening">
          <OpeningBalanceForm v-if="settingsStore.openingBalance" />
          <div v-else class="py-8 text-center text-gray-500">
            <i class="pi pi-info-circle text-2xl mb-2"></i>
            <p>{{ t('settings.openingNotConfigured') }}</p>
          </div>
        </TabPanel>
        <TabPanel value="wc">
          <WorkingCapitalForm v-if="settingsStore.wcConfig" />
          <div v-else class="py-8 text-center text-gray-500">
            <i class="pi pi-info-circle text-2xl mb-2"></i>
            <p>{{ t('settings.wcNotAvailable') }}</p>
          </div>
        </TabPanel>
        <TabPanel value="opex-params">
          <OpexPerHireForm />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
