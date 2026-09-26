<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFeaturePolicyStore } from '@/features/admin/stores/featurePolicyStore'
import type { FeaturePolicy, TierRule } from '@/features/admin/stores/featurePolicyStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const store = useFeaturePolicyStore()
const toast = useToast()

onMounted(() => store.refresh())

// ── Grouping ──────────────────────────────────────────────────────────────────

const categories = computed(() => {
  const set = new Set(store.policies.map(p => p.category))
  return Array.from(set).sort()
})

function policiesForCategory(cat: string) {
  return store.policies.filter(p => p.category === cat).sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

const dialogVisible = ref(false)
const editing = ref<FeaturePolicy | null>(null)

// Editable copies of each tier rule
const editFreemium = ref<TierRule>({})
const editPro = ref<TierRule>({})
const editEnterprise = ref<TierRule>({})

function openEdit(p: FeaturePolicy) {
  editing.value = p
  editFreemium.value = { ...p.freemium }
  editPro.value = { ...p.pro }
  editEnterprise.value = { ...p.enterprise }
  dialogVisible.value = true
}

async function saveEdit() {
  if (!editing.value) return
  const updated = await store.updatePolicy(editing.value.feature, {
    freemium: editFreemium.value,
    pro: editPro.value,
    enterprise: editEnterprise.value,
  })
  if (updated) {
    dialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Saved', detail: `${editing.value.label} policy updated`, life: 3000 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

function renderRule(rule: TierRule, featureType: string): string {
  if (featureType === 'access') {
    return rule.allowed ? '✓ Yes' : '✗ No'
  }
  if (featureType === 'numeric_limit') {
    if (rule.limit === -1) return '∞ Unlimited'
    if (rule.limit == null) return '—'
    return String(rule.limit)
  }
  return '—'
}

function ruleSeverity(rule: TierRule, featureType: string): 'success' | 'danger' | 'secondary' | 'info' {
  if (featureType === 'access') {
    return rule.allowed ? 'success' : 'danger'
  }
  if (featureType === 'numeric_limit') {
    if (rule.limit === -1) return 'success'
    if (!rule.limit) return 'secondary'
    return 'info'
  }
  return 'secondary'
}

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
</script>

<template>
  <div>
    <Toast />

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Feature Policies</h1>
      <p class="text-gray-500 text-sm mt-1">
        Configure which features are accessible per commercial tier.
        Changes take effect within 5 minutes (server-side cache TTL).
      </p>
    </div>

    <Message severity="info" :closable="false" class="mb-5">
      Policies are stored in the database and served to the frontend on each session.
      Editing a policy here immediately changes what users see the next time they navigate.
    </Message>

    <div v-if="store.loading && !store.loaded" class="flex justify-center py-20">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <Message v-else-if="store.error && !store.loaded" severity="error" class="mb-4">
      {{ store.error }}
    </Message>

    <template v-else>
      <div v-for="cat in categories" :key="cat" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>{{ categoryLabel(cat) }}</span>
          <span class="h-px flex-1 bg-gray-200"></span>
        </h2>

        <DataTable
          :value="policiesForCategory(cat)"
          tableStyle="table-layout: fixed; min-width: 600px"
          class="p-datatable-sm rounded-xl border border-gray-200 overflow-hidden"
        >
          <!-- Feature label -->
          <Column style="width: 220px">
            <template #header>Feature</template>
            <template #body="{ data }">
              <div>
                <span class="font-medium text-gray-800">{{ data.label }}</span>
                <br />
                <span class="font-mono text-xs text-gray-400">{{ data.feature }}</span>
              </div>
            </template>
          </Column>

          <!-- Type badge -->
          <Column style="width: 120px">
            <template #header>Type</template>
            <template #body="{ data }">
              <Tag
                :value="data.featureType === 'access' ? 'access' : 'limit'"
                :severity="data.featureType === 'access' ? 'secondary' : 'info'"
                class="text-xs font-mono"
              />
            </template>
          </Column>

          <!-- Freemium -->
          <Column style="width: 110px">
            <template #header>
              <span class="text-gray-500">Freemium</span>
            </template>
            <template #body="{ data }">
              <Tag
                :value="renderRule(data.freemium, data.featureType)"
                :severity="ruleSeverity(data.freemium, data.featureType)"
                class="text-xs"
              />
            </template>
          </Column>

          <!-- Pro -->
          <Column style="width: 110px">
            <template #header>
              <span class="text-blue-600 font-semibold">Pro</span>
            </template>
            <template #body="{ data }">
              <Tag
                :value="renderRule(data.pro, data.featureType)"
                :severity="ruleSeverity(data.pro, data.featureType)"
                class="text-xs"
              />
            </template>
          </Column>

          <!-- Enterprise -->
          <Column style="width: 110px">
            <template #header>
              <span class="text-purple-600 font-semibold">Enterprise</span>
            </template>
            <template #body="{ data }">
              <Tag
                :value="renderRule(data.enterprise, data.featureType)"
                :severity="ruleSeverity(data.enterprise, data.featureType)"
                class="text-xs"
              />
            </template>
          </Column>

          <!-- Updated at -->
          <Column style="width: 120px">
            <template #header>Updated</template>
            <template #body="{ data }">
              <span class="text-xs text-gray-400">
                {{ new Date(data.updatedAt).toLocaleDateString('fr-FR') }}
              </span>
            </template>
          </Column>

          <!-- Actions -->
          <Column style="width: 60px">
            <template #header></template>
            <template #body="{ data }">
              <Button
                icon="pi pi-pencil"
                text rounded size="small"
                title="Edit policy"
                @click="openEdit(data)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <!-- Edit dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editing ? `Edit policy — ${editing.label}` : 'Edit policy'"
      :modal="true"
      :closable="true"
      class="w-full max-w-lg"
    >
      <div v-if="editing" class="space-y-6 pt-2">
        <p class="text-xs text-gray-500">
          Feature: <code class="bg-gray-100 px-1 rounded-sm">{{ editing.feature }}</code>
          &nbsp;·&nbsp; Type: <strong>{{ editing.featureType }}</strong>
        </p>

        <!-- Access type: boolean toggles -->
        <template v-if="editing.featureType === 'access'">
          <div v-for="(tier, label) in { Freemium: 'freemium', Pro: 'pro', Enterprise: 'enterprise' }" :key="label" class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">{{ label }}</span>
            <div class="flex gap-2">
              <Button
                :label="'Allow'"
                size="small"
                :severity="(tier === 'freemium' ? editFreemium : tier === 'pro' ? editPro : editEnterprise).allowed ? 'success' : 'secondary'"
                @click="(tier === 'freemium' ? editFreemium : tier === 'pro' ? editPro : editEnterprise).allowed = true"
              />
              <Button
                :label="'Deny'"
                size="small"
                :severity="(tier === 'freemium' ? editFreemium : tier === 'pro' ? editPro : editEnterprise).allowed === false ? 'danger' : 'secondary'"
                @click="(tier === 'freemium' ? editFreemium : tier === 'pro' ? editPro : editEnterprise).allowed = false"
              />
            </div>
          </div>
        </template>

        <!-- Numeric limit type: integer inputs -->
        <template v-if="editing.featureType === 'numeric_limit'">
          <p class="text-xs text-gray-400">Enter -1 for unlimited.</p>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Freemium</label>
              <InputNumber
                v-model="editFreemium.limit"
                :min="-1"
                class="w-full"
                inputClass="text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-blue-600 mb-1">Pro</label>
              <InputNumber
                v-model="editPro.limit"
                :min="-1"
                class="w-full"
                inputClass="text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-purple-600 mb-1">Enterprise</label>
              <InputNumber
                v-model="editEnterprise.limit"
                :min="-1"
                class="w-full"
                inputClass="text-sm"
              />
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" text @click="dialogVisible = false" :disabled="store.saving" />
          <Button
            label="Save"
            icon="pi pi-check"
            :loading="store.saving"
            :disabled="store.saving"
            @click="saveEdit"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
