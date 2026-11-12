<template>
  <div>
    <PageHeader eyebrow="Catálogo" title="Productos" description="Fichas de producto del catálogo de la tienda.">
      <template v-if="canCreate" #actions>
        <BaseButton @click="createOpen = true">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nuevo producto
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar productos"
          search-placeholder="Buscar por nombre, slug o descripción…"
          @update:search="table.setSearch"
        />
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Productos"
          :empty-title="table.search.value ? 'Sin coincidencias' : 'Aún no hay productos'"
          :empty-description="table.search.value ? 'Prueba con otro término de búsqueda.' : undefined"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/products/${row.id}`" class="group block">
              <span class="block font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name }}</span>
              <span class="block font-mono text-[11px] text-lumia-ink/45">{{ row.slug }}</span>
            </NuxtLink>
          </template>
          <template #cell-categorySlug="{ row }">
            <span v-if="row.categorySlug" class="text-lumia-ink/75">{{ row.categorySlug }}</span>
            <span v-else class="text-lumia-ink/35">Sin categoría</span>
          </template>
          <template #cell-status="{ row }">
            <ProductStatusBadge :status="row.status" />
          </template>
          <template #cell-taxRate="{ row }">
            <span v-if="row.taxRate !== null" class="tabular-nums">{{ row.taxRate }}%</span>
            <BaseBadge v-else tone="warning" title="Sin tarifa de IVA configurada">Sin IVA</BaseBadge>
          </template>
          <template #cell-updatedAt="{ row }">
            <span class="text-[13px] text-lumia-ink/60">{{ row.updatedAt ? formatDateTime(row.updatedAt) : '—' }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton :to="`/products/${row.id}`" variant="ghost" size="sm">
              <template #icon>
                <IconChevronRight class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only">Ver {{ row.name }}</span>
            </BaseButton>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="productos"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>

    <ProductCreateDialog v-model:open="createOpen" @created="(id) => navigateTo(`/products/${id}`)" />
  </div>
</template>

<script setup lang="ts">
import { IconChevronRight, IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { ProductRow } from '#shared/schemas/products'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Productos',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Productos' }],
})

const auth = useAuth()
const canCreate = computed(() => auth.can(PERMISSIONS.PRODUCTS_CREATE))
const createOpen = ref(false)

const table = useTableQuery({ allowedLimits: [20, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<ProductRow>(
  'admin-products',
  '/api/admin/products',
  table,
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Producto' },
  { key: 'categorySlug', label: 'Categoría' },
  { key: 'status', label: 'Estado' },
  { key: 'taxRate', label: 'IVA', align: 'right', class: 'w-24' },
  { key: 'updatedAt', label: 'Actualizado', hideOnMobile: true },
]
</script>
