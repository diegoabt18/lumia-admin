<template>
  <div>
    <PageHeader
      eyebrow="Catálogo"
      title="Subcategorías"
      description="Cada subcategoría pertenece a una categoría, y los productos se asignan a una subcategoría. Para crear una nueva, entra a su categoría."
    />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar subcategorías"
          search-placeholder="Buscar por nombre o slug…"
          @update:search="table.setSearch"
        >
          <template #filters>
            <label for="subcategory-category-filter" class="sr-only">Filtrar por categoría</label>
            <select
              id="subcategory-category-filter"
              v-model="categoryFilter"
              class="h-10 rounded-md border border-lumia-ink/15 bg-white px-3 text-[14px] text-lumia-ink"
            >
              <option value="">Todas las categorías</option>
              <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
                {{ category.name }}
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
          caption="Subcategorías"
          :empty-title="table.search.value || categoryFilter ? 'Sin coincidencias' : 'Aún no hay subcategorías'"
          :empty-description="table.search.value || categoryFilter ? 'Prueba con otro filtro.' : 'Crea una subcategoría desde su categoría.'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <span class="font-medium text-lumia-ink">{{ row.name }}</span>
            <p v-if="row.description" class="mt-0.5 line-clamp-1 text-[12px] text-lumia-ink/55">{{ row.description }}</p>
          </template>
          <template #cell-categoryName="{ row }">
            <NuxtLink :to="`/categories/${row.categoryId}`" class="text-lumia-ink/80 hover:underline">
              {{ row.categoryName }}
            </NuxtLink>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="row.status === 'active' ? 'positive' : 'neutral'">
              {{ row.status === 'active' ? 'Activa' : 'Inactiva' }}
            </BaseBadge>
          </template>
          <template #cell-productCount="{ row }">
            <BaseBadge :tone="row.productCount ? 'neutral' : 'warning'">{{ row.productCount }}</BaseBadge>
          </template>
          <template #cell-sortOrder="{ row }">
            <span class="tabular-nums text-lumia-ink/70">{{ row.sortOrder }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton v-if="canUpdate" variant="ghost" size="sm" @click="openEdit(row)">
              <template #icon>
                <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Editar</span>
            </BaseButton>
            <BaseButton
              v-if="canUpdate"
              variant="ghost"
              size="sm"
              :loading="statusingId === row.id"
              :disabled="statusingId === row.id"
              @click="onToggleStatus(row)"
            >
              <span class="sr-only md:not-sr-only">{{ row.status === 'active' ? 'Desactivar' : 'Activar' }}</span>
            </BaseButton>
            <BaseButton
              v-if="canDelete"
              variant="ghost"
              size="sm"
              :disabled="row.productCount > 0 || deletingId === row.id"
              :loading="deletingId === row.id"
              :title="row.productCount > 0 ? 'Tiene productos asignados: reasígnalos o desactívala.' : undefined"
              @click="onDelete(row)"
            >
              <template #icon>
                <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Eliminar</span>
            </BaseButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="subcategorías"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>

    <CategoryFormDialog v-model:open="dialogOpen" kind="subcategory" :item="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { CategoryList, SubcategoryListRow } from '#shared/schemas/categories'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Subcategorías',
  permissions: [PERMISSIONS.CATEGORIES_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Subcategorías' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const canUpdate = computed(() => auth.can(PERMISSIONS.CATEGORIES_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.CATEGORIES_DELETE))

const { data: categoryData } = await useAsyncData('subcategory-filter-categories', () =>
  request<CategoryList>('/api/admin/categories', { query: { limit: 100 } }),
)
const categoryOptions = computed(() => categoryData.value?.items ?? [])

const categoryFilter = ref('')
const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const extraQuery = computed(() => ({ category: categoryFilter.value || undefined }))
const { rows, pagination, loading, errorMessage, refresh } = useServerList<SubcategoryListRow>(
  'admin-subcategories',
  '/api/admin/subcategories',
  table,
  extraQuery,
)

watch(categoryFilter, () => table.setPage(1))

const columns: TableColumn[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'categoryName', label: 'Categoría', class: 'w-56' },
  { key: 'status', label: 'Estado', class: 'w-28' },
  { key: 'productCount', label: 'Productos', align: 'right', class: 'w-28' },
  { key: 'sortOrder', label: 'Orden', align: 'right', class: 'w-20' },
]

const dialogOpen = ref(false)
const editing = ref<SubcategoryListRow | null>(null)
const deletingId = ref<string | null>(null)
const statusingId = ref<string | null>(null)

function openEdit(row: SubcategoryListRow) {
  editing.value = row
  dialogOpen.value = true
}

async function onToggleStatus(row: SubcategoryListRow) {
  if (statusingId.value) return
  const next = row.status === 'active' ? 'inactive' : 'active'
  statusingId.value = row.id
  try {
    await request(`/api/admin/subcategories/${row.id}/status`, { method: 'PATCH', body: { status: next } })
    toast.success(next === 'active' ? 'Subcategoría activada' : 'Subcategoría desactivada')
    await refresh()
  } catch (error) {
    toast.error('No se pudo cambiar el estado', toUiError(error).message)
  } finally {
    statusingId.value = null
  }
}

async function onDelete(row: SubcategoryListRow) {
  if (row.productCount > 0 || deletingId.value) return
  const ok = await confirm({
    title: `Eliminar "${row.name}"`,
    description: 'La subcategoría se eliminará de forma permanente. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deletingId.value = row.id
  try {
    await request(`/api/admin/subcategories/${row.id}`, { method: 'DELETE' })
    toast.success('Subcategoría eliminada')
    await refresh()
  } catch (error) {
    toast.error('No se pudo eliminar la subcategoría', toUiError(error).message)
  } finally {
    deletingId.value = null
  }
}
</script>
