<script setup lang="ts">
/**
 * AccessMatrixView — Permission & Access Control reference matrix.
 *
 * Implements Section 11.4 of the Admin UX Proposal.
 * Rows = operations, grouped by domain.
 * Columns = roles: Owner | Admin (platform) | User+Editor | User+Viewer
 */

interface MatrixRow {
  operation: string
  owner: Cell
  admin: Cell    // platform admin (role=admin)
  editor: Cell   // user with plan membership role=editor
  viewer: Cell   // user with plan membership role=viewer
  note?: string
}

interface MatrixGroup {
  label: string
  icon: string
  rows: MatrixRow[]
}

type Cell = 'yes' | 'no' | 'cond'

// ── Permission matrix definition ─────────────────────────────────────────────

const groups: MatrixGroup[] = [
  {
    label: 'Tenant Administration',
    icon: 'pi-building',
    rows: [
      { operation: 'Invite users',               owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no',  note: 'Admin role is platform-assigned only' },
      { operation: 'Deactivate / reactivate users', owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'Delete users (soft)',          owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'Transfer ownership',           owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'Manage tenant settings',       owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'View user list',               owner: 'yes', admin: 'yes', editor: 'no',  viewer: 'no' },
    ],
  },
  {
    label: 'Plan Lifecycle',
    icon: 'pi-briefcase',
    rows: [
      { operation: 'Create plan',                  owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'View plan list',               owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes', note: 'Members see plans they are added to' },
      { operation: 'Edit plan name / description', owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no' },
      { operation: 'Add / remove plan members',    owner: 'yes', admin: 'no',  editor: 'cond', viewer: 'no', note: 'Editors can invite other members' },
      { operation: 'Move to In Review (draft→review)', owner: 'yes', admin: 'no', editor: 'yes', viewer: 'no' },
      { operation: 'Lock plan (review→approved)',  owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no', note: 'Approved plans are read-only for editors' },
      { operation: 'Unlock plan (approved→review)', owner: 'yes', admin: 'no', editor: 'no',  viewer: 'no' },
      { operation: 'Archive plan',                 owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
      { operation: 'Delete plan',                  owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no', note: 'Blocked if plan is approved or demo' },
    ],
  },
  {
    label: 'Scenario Operations',
    icon: 'pi-sitemap',
    rows: [
      { operation: 'Create scenario',              owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no' },
      { operation: 'Clone scenario',               owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no' },
      { operation: 'Delete scenario',              owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no', note: 'Blocked if last scenario in plan' },
      { operation: 'View scenarios',               owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
    ],
  },
  {
    label: 'Financial Data Entry',
    icon: 'pi-table',
    rows: [
      { operation: 'View all financial modules',   owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
      { operation: 'Edit assumptions (products, staff, capex…)', owner: 'yes', admin: 'no', editor: 'yes', viewer: 'no', note: 'Blocked on approved plans' },
      { operation: 'Edit plan settings / config',  owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no', note: 'Blocked on approved plans' },
      { operation: 'Run compute / view report',    owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
      { operation: 'Download/export report',       owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
    ],
  },
  {
    label: 'Snapshots',
    icon: 'pi-camera',
    rows: [
      { operation: 'Create snapshot',              owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'no' },
      { operation: 'View / compare snapshots',     owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
      { operation: 'Restore snapshot',             owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no', note: 'Destructive — owner only' },
      { operation: 'Delete snapshot',              owner: 'yes', admin: 'no',  editor: 'no',  viewer: 'no' },
    ],
  },
  {
    label: 'AI Features',
    icon: 'pi-sparkles',
    rows: [
      { operation: 'Chat with plan',               owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
      { operation: 'Generate executive summary',   owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
      { operation: 'Plan bootstrap (AI assumptions)', owner: 'yes', admin: 'no', editor: 'yes', viewer: 'no' },
      { operation: 'Assumption validation',        owner: 'yes', admin: 'no',  editor: 'yes', viewer: 'yes' },
    ],
  },
]

// ── Cell helpers ──────────────────────────────────────────────────────────────

function cellIcon(cell: Cell): string {
  switch (cell) {
    case 'yes':  return 'pi-check-circle'
    case 'no':   return 'pi-times-circle'
    case 'cond': return 'pi-exclamation-circle'
  }
}

function cellColor(cell: Cell): string {
  switch (cell) {
    case 'yes':  return 'text-emerald-600'
    case 'no':   return 'text-gray-300'
    case 'cond': return 'text-amber-500'
  }
}

function cellLabel(cell: Cell): string {
  switch (cell) {
    case 'yes':  return 'Allowed'
    case 'no':   return 'Denied'
    case 'cond': return 'Conditional'
  }
}
</script>

<template>
  <div class="max-w-6xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Permission & Access Matrix</h1>
      <p class="text-gray-500 text-sm mt-1">
        Reference guide to what each role can do across all system operations.
      </p>
    </div>

    <!-- Role legend -->
    <div class="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-red-400 shrink-0"></span>
        <div>
          <span class="text-sm font-semibold text-gray-700">Owner</span>
          <span class="text-xs text-gray-400 ml-1">— Tenant administrator. Full control.</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
        <div>
          <span class="text-sm font-semibold text-gray-700">Admin</span>
          <span class="text-xs text-gray-400 ml-1">— Platform operator. User management only; no business data.</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-blue-400 shrink-0"></span>
        <div>
          <span class="text-sm font-semibold text-gray-700">Editor</span>
          <span class="text-xs text-gray-400 ml-1">— User with editor membership on a plan.</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-gray-400 shrink-0"></span>
        <div>
          <span class="text-sm font-semibold text-gray-700">Viewer</span>
          <span class="text-xs text-gray-400 ml-1">— User with viewer membership. Read-only.</span>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <i class="pi pi-check-circle text-emerald-600 text-sm"></i><span class="text-xs text-gray-500">Allowed</span>
        <i class="pi pi-exclamation-circle text-amber-500 text-sm ml-2"></i><span class="text-xs text-gray-500">Conditional</span>
        <i class="pi pi-times-circle text-gray-300 text-sm ml-2"></i><span class="text-xs text-gray-500">Denied</span>
      </div>
    </div>

    <!-- Matrix groups -->
    <div class="space-y-6">
      <div
        v-for="group in groups"
        :key="group.label"
        class="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
      >
        <!-- Group header -->
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <i :class="['pi text-gray-500', group.icon]"></i>
          <h2 class="font-semibold text-gray-700 text-sm uppercase tracking-wide">{{ group.label }}</h2>
        </div>

        <!-- Table -->
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left py-2 px-5 font-medium text-gray-500 text-xs w-1/2">Operation</th>
              <th class="text-center py-2 px-3 font-medium text-xs w-[12%]">
                <span class="flex items-center justify-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-red-400"></span>Owner
                </span>
              </th>
              <th class="text-center py-2 px-3 font-medium text-xs w-[12%]">
                <span class="flex items-center justify-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>Admin
                </span>
              </th>
              <th class="text-center py-2 px-3 font-medium text-xs w-[12%]">
                <span class="flex items-center justify-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-blue-400"></span>Editor
                </span>
              </th>
              <th class="text-center py-2 px-3 font-medium text-xs w-[12%]">
                <span class="flex items-center justify-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-gray-400"></span>Viewer
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in group.rows"
              :key="row.operation"
              class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
            >
              <td class="py-2.5 px-5 text-gray-700">
                {{ row.operation }}
                <span
                  v-if="row.note"
                  class="block text-xs text-gray-400 mt-0.5"
                >{{ row.note }}</span>
              </td>
              <td
                v-for="(colKey, idx) in (['owner', 'admin', 'editor', 'viewer'] as const)"
                :key="idx"
                class="text-center py-2.5 px-3"
              >
                <i
                  :class="['pi', cellIcon(row[colKey]), cellColor(row[colKey])]"
                  :title="cellLabel(row[colKey])"
                ></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer note -->
    <p class="mt-6 text-xs text-gray-400 text-center">
      All access is additionally enforced server-side via middleware. This matrix is a UX reference only.
    </p>
  </div>
</template>
