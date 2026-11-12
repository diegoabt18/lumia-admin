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
        >
          <template #filters>
            <label for="product-category-filter" class="sr-only">Filtrar por categoría</label>
            <select
              id="product-category-filter"
              v-model="categoryFilter"
              class="h-10 rounded-md border border-lumia-ink/15 bg-white px-3 text-[14px] text-lumia-ink"
            >
              <option value="">Todas las categorías</option>
              <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <label for="product-subcategory-filter" class="sr-only">Filtrar por subcategoría</label>
            <select
              id="product-subcategory-filter"
              v-model="subcategoryFilter"
              :disabled="!categoryFilter"
              class="h-10 rounded-md border border-lumia-ink/15 bg-white px-3 text-[14px] text-lumia-ink disabled:opacity-50"
            >
              <option value="">Todas las subcategorías</option>
              <option v-for="sub in subcategoryOptions" :key="sub.id" :value="sub.id">
                {{ sub.name }}
              </option>
            </select>
          </template>
        </TableToolbar>
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
          <template #cell-subcategoryName="{ row }">
            <span v-if="row.subcategoryName" class="text-lumia-ink/75">
              {{ row.categoryName }} <span class="text-lumia-ink/35" aria-hidden="true">›</span> {{ row.subcategoryName }}
            </span>
            <span v-else class="text-lumia-ink/35">Sin subcategoría</span>
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

const { request } = useAdminApi()

// Filtros de jerarquía: primero categoría, luego subcategoría (solo de esa categoría).
const { data: categoryData } = await useAsyncData('product-filter-categories', () =>
  request<{ items: Array<{ id: string; name: string }> }>('/api/admin/categories', { query: { limit: 100 } }),
)
const categoryOptions = computed(() => categoryData.value?.items ?? [])

const categoryFilter = ref('')
const subcategoryFilter = ref('')
const subcategoryOptions = ref<Array<{ id: string; name: string }>>([])

watch(categoryFilter, async (categoryId) => {
  subcategoryFilter.value = ''
  subcategoryOptions.value = []
  if (!categoryId) return
  try {
    const res = await request<{ items: Array<{ id: string; name: string }> }>(
      `/api/admin/categories/${categoryId}/subcategories`,
    )
    subcategoryOptions.value = res.items
  } catch {
    subcategoryOptions.value = []
  }
})

const table = useTableQuery({ allowedLimits: [20, 50, 100] })
const extraQuery = computed(() => ({
  category: categoryFilter.value || undefined,
  subcategory: subcategoryFilter.value || undefined,
}))
const { rows, pagination, loading, errorMessage, refresh } = useServerList<ProductRow>(
  'admin-products',
  '/api/admin/products',
  table,
  extraQuery,
)

watch([categoryFilter, subcategoryFilter], () => table.setPage(1))

const columns: TableColumn[] = [
  { key: 'name', label: 'Producto' },
  { key: 'subcategoryName', label: 'Categoría › Subcategoría' },
  { key: 'status', label: 'Estado' },
  { key: 'taxRate', label: 'IVA', align: 'right', class: 'w-24' },
  { key: 'updatedAt', label: 'Actualizado', hideOnMobile: true },
]
</script>
