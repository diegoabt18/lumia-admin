<template>
  <div>
    <PageHeader eyebrow="Producción" title="Proveedores" description="Proveedores de materiales para producción.">
      <template v-if="canCreate" #actions>
        <BaseButton @click="openDialog(null)">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nuevo proveedor
        </BaseButton>
      </template>
    </PageHeader>
    <ProductionTabs />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar proveedores" search-placeholder="Nombre o contacto…" @update:search="table.setSearch">
          <template #filters>
            <BaseCheckbox :id="activeId" :model-value="activeOnly" @update:model-value="setActiveOnly">Solo activos</BaseCheckbox>
          </template>
        </TableToolbar>
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Proveedores"
          :empty-title="table.search.value || activeOnly ? 'Sin coincidencias' : 'Aún no hay proveedores'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <span class="flex items-center gap-1.5 font-medium text-lumia-ink">
              <IconStarFilled v-if="row.isFavorite" class="h-3.5 w-3.5 text-lumia-gold" aria-label="Favorito" />
              {{ row.name }}
            </span>
            <span v-if="row.notes" class="line-clamp-1 text-[12px] text-lumia-ink/50">{{ row.notes }}</span>
          </template>
          <template #cell-contact="{ row }">
            <span class="block text-lumia-ink/80">{{ row.contactName || '—' }}</span>
            <span class="block text-[12px] text-lumia-ink/55">
              <template v-if="row.phone">{{ row.phone }}</template><template v-if="row.phone && row.email"> · </template><template v-if="row.email">{{ row.email }}</template>
            </span>
          </template>
          <template #cell-active="{ row }">
            <BaseBadge :tone="row.active ? 'positive' : 'neutral'">{{ row.active ? 'Activo' : 'Inactivo' }}</BaseBadge>
          </template>
          <template v-if="canUpdate" #actions="{ row }">
            <BaseButton variant="ghost" size="sm" @click="openDialog(row)">
              <template #icon>
                <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Editar</span>
            </BaseButton>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="proveedores"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
        <p class="text-[12px] text-lumia-ink/50">Los proveedores no se eliminan desde aquí: desactívalos. El servidor los borraría sin quitar sus vínculos con materiales.</p>
      </div>
    </BaseCard>

    <SupplierFormDialog v-model:open="dialogOpen" :supplier="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlus, IconStarFilled } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { SupplierRow } from '#shared/schemas/production'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Proveedores',
  permissions: [PERMISSIONS.SUPPLIERS_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Proveedores' }],
})

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const canCreate = computed(() => auth.can(PERMISSIONS.SUPPLIERS_CREATE))
const canUpdate = computed(() => auth.can(PERMISSIONS.SUPPLIERS_UPDATE))

const activeId = useId()
const activeOnly = computed(() => route.query.active === '1')
function setActiveOnly(value: boolean) {
  void router.replace({ query: { ...route.query, active: value ? '1' : undefined, page: undefined } })
}

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<SupplierRow>(
  'admin-production-suppliers',
  '/api/admin/production/suppliers',
  table,
  computed(() => ({ active: activeOnly.value ? '1' : undefined })),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Proveedor' },
  { key: 'contact', label: 'Contacto', hideOnMobile: true },
  { key: 'active', label: 'Estado', class: 'w-28' },
]

const dialogOpen = ref(false)
const editing = ref<SupplierRow | null>(null)
function openDialog(row: SupplierRow | null) {
  editing.value = row
  dialogOpen.value = true
}
</script>
