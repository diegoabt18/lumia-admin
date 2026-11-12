<template>
  <div class="space-y-4">
    <TableToolbar
      :search="table.search.value"
      search-label="Buscar en cambios de permisos"
      search-placeholder="Resumen, elemento o identificador…"
      @update:search="table.setSearch"
    >
      <template #filters>
        <AuditDateRange :from="filters.from.value" :to="filters.to.value" @update="filters.setRange" />
      </template>
    </TableToolbar>

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-key="(row) => row.id"
      :loading="loading"
      :error="errorMessage"
      caption="Cambios de permisos"
      empty-title="Sin registros"
      :empty-description="table.search.value || filters.from.value || filters.to.value ? 'Prueba con otros filtros.' : 'El servidor solo registra aquí permisos temporales e importaciones de roles.'"
      @retry="refresh"
    >
      <template #cell-at="{ row }">
        <span class="whitespace-nowrap tabular-nums text-lumia-ink/70">{{ row.at ? formatDateTime(row.at) : '—' }}</span>
      </template>
      <template #cell-action="{ row }">
        <div class="flex flex-wrap gap-1">
          <BaseBadge tone="info">{{ PERMISSION_AUDIT_ACTION_LABELS[row.action] ?? row.action }}</BaseBadge>
          <BaseBadge tone="neutral">{{ PERMISSION_AUDIT_ENTITY_LABELS[row.entityType] ?? row.entityType }}</BaseBadge>
        </div>
      </template>
      <template #cell-summary="{ row }">
        <p class="line-clamp-3 max-w-lg break-words text-lumia-ink">{{ row.summary || '—' }}</p>
        <code v-if="row.entityLabel" class="mt-0.5 block truncate text-[11px] text-lumia-ink/50">{{ row.entityLabel }}</code>
      </template>
      <template #cell-changedBy="{ row }">
        <span class="break-all text-[13px] text-lumia-ink/75">{{ row.changedByEmail || row.changedBy || '—' }}</span>
      </template>
    </DataTable>
    <AppPagination
      v-if="pagination"
      :pagination="pagination"
      :limit-options="[25, 50, 100]"
      item-label="registros"
      :disabled="loading"
      @update:page="table.setPage"
      @update:limit="table.setLimit"
    />
  </div>
</template>

<script setup lang="ts">
import {
  PERMISSION_AUDIT_ACTION_LABELS,
  PERMISSION_AUDIT_ENTITY_LABELS,
  type PermissionAuditRow,
} from '#shared/schemas/audit'
import type { TableColumn } from '~/types/ui'

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const filters = useAuditFilters()

const { rows, pagination, loading, errorMessage, refresh } = useServerList<PermissionAuditRow>(
  'admin-audit-permissions',
  '/api/admin/audit/permissions',
  table,
  computed(() => ({ from: filters.from.value || undefined, to: filters.to.value || undefined })),
)

const columns: TableColumn[] = [
  { key: 'at', label: 'Fecha', class: 'w-40' },
  { key: 'action', label: 'Acción', class: 'w-48' },
  { key: 'summary', label: 'Detalle' },
  { key: 'changedBy', label: 'Realizado por', class: 'w-56', hideOnMobile: true },
]
</script>
