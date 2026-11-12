<template>
  <div>
    <PageHeader eyebrow="Catálogo" title="Categorías" description="Agrupaciones del catálogo visibles en la tienda.">
      <template v-if="canCreate" #actions>
        <BaseButton @click="openCreate">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nueva categoría
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar categorías"
          search-placeholder="Buscar por nombre o slug…"
          @update:search="table.setSearch"
        />
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Categorías"
          :empty-title="table.search.value ? 'Sin coincidencias' : 'Aún no hay categorías'"
          :empty-description="table.search.value ? 'Prueba con otro término de búsqueda.' : undefined"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <span class="font-medium text-lumia-ink">{{ row.name }}</span>
          </template>
          <template #cell-slug="{ row }">
            <code class="rounded bg-lumia-cream/70 px-1.5 py-0.5 text-[12px] text-lumia-ink/70">{{ row.slug }}</code>
          </template>
          <template #cell-productCount="{ row }">
            <BaseBadge :tone="row.productCount ? 'neutral' : 'warning'">{{ row.productCount }}</BaseBadge>
          </template>
          <template v-if="canUpdate || canDelete" #actions="{ row }">
            <BaseButton v-if="canUpdate" variant="ghost" size="sm" @click="openEdit(row)">
              <template #icon>
                <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Editar</span>
            </BaseButton>
            <BaseButton
              v-if="canDelete"
              variant="ghost"
              size="sm"
              :disabled="row.productCount > 0 || deletingId === row.id"
              :loading="deletingId === row.id"
              :title="row.productCount > 0 ? 'Tiene productos asociados: reasígnalos antes de eliminar' : undefined"
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
          item-label="categorías"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>

    <CategoryFormDialog v-model:open="dialogOpen" :category="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { CategoryRow } from '#shared/schemas/categories'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Categorías',
  permissions: [PERMISSIONS.CATEGORIES_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Categorías' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const canCreate = computed(() => auth.can(PERMISSIONS.CATEGORIES_CREATE))
const canUpdate = computed(() => auth.can(PERMISSIONS.CATEGORIES_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.CATEGORIES_DELETE))

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<CategoryRow>(
  'admin-categories',
  '/api/admin/categories',
  table,
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'slug', label: 'Slug' },
  { key: 'productCount', label: 'Productos', align: 'right', class: 'w-28' },
]

const dialogOpen = ref(false)
const editing = ref<CategoryRow | null>(null)
const deletingId = ref<string | null>(null)

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(row: CategoryRow) {
  editing.value = row
  dialogOpen.value = true
}

async function onDelete(row: CategoryRow) {
  if (row.productCount > 0 || deletingId.value) return
  const ok = await confirm({
    title: `Eliminar "${row.name}"`,
    description: 'La categoría se eliminará de forma permanente. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deletingId.value = row.id
  try {
    await request(`/api/admin/categories/${row.id}`, { method: 'DELETE' })
    toast.success('Categoría eliminada')
    await refresh()
  } catch (error) {
    toast.error('No se pudo eliminar la categoría', toUiError(error).message)
  } finally {
    deletingId.value = null
  }
}
</script>
