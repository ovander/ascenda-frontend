<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

defineProps<{
  /** Column field names to show (e.g. ['label', 'year1', 'year3', 'year5']) */
  visibleColumns: string[]
  /** All column definitions: { field, header } */
  columns: { field: string; header: string }[]
  data: Record<string, any>[]
  frozenField?: string
}>()
</script>

<template>
  <DataTable
    :value="data"
    size="small"
    scrollable
    showGridlines
    class="p-datatable-sm"
  >
    <Column
      v-for="col in columns.filter(c => visibleColumns.includes(c.field))"
      :key="col.field"
      :field="col.field"
      :header="col.header"
      :frozen="col.field === frozenField"
      :style="col.field === frozenField ? 'min-width: 160px' : 'min-width: 90px'"
    />
  </DataTable>
</template>
