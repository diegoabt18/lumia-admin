<template>
  <div>
    <PageHeader
      eyebrow="Catálogo"
      title="Categorías"
      description="Agrupaciones del catálogo. Cada categoría contiene subcategorías, y los productos se asignan a una subcategoría."
    >
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
          :empty-description="table.search.value ? 'Prueba con otro término de búsqueda.' : 'Crea la primera categoría para empezar a organizar el catálogo.'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/categories/${row.id}`" class="font-medium text-lumia-ink hover:underline">
              {{ row.name }}
            </NuxtLink>
            <p v-if="row.description" class="mt-0.5 line-clamp-1 text-[12px] text-lumia-ink/55">{{ row.description }}</p>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="row.status === 'active' ? 'positive' : 'neutral'">
              {{ row.status === 'active' ? 'Activa' : 'Inactiva' }}
            </BaseBadge>
          </template>
          <template #cell-subcategoryCount="{ row }">
            <span class="tabular-nums text-lumia-ink/80">{{ row.subcategoryCount }}</span>
            <span v-if="row.subcategoryCount" class="text-[12px] text-lumia-ink/45"> ({{ row.activeSubcategoryCount }} activas)</span>
          </template>
          <template #cell-productCount="{ row }">
            <BaseBadge :tone="row.productCount ? 'neutral' : 'warning'">{{ row.productCount }}</BaseBadge>
          </template>
          <template #cell-sortOrder="{ row }">
            <span class="tabular-nums text-lumia-ink/70">{{ row.sortOrder }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton variant="ghost" size="sm" :to="`/categories/${row.id}`">
              <span class="sr-only md:not-sr-only">Subcategorías</span>
            </BaseButton>
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
              :disabled="!canDeleteRow(row) || deletingId === row.id"
              :loading="deletingId === row.id"
              :title="deleteBlockReason(row)"
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

    <CategoryFormDialog v-model:open="dialogOpen" kind="category" :item="editing" @saved="refresh" />
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
  { key: 'status', label: 'Estado', class: 'w-28' },
  { key: 'subcategoryCount', label: 'Subcategorías', align: 'right', class: 'w-44' },
  { key: 'productCount', label: 'Productos', align: 'right', class: 'w-28' },
  { key: 'sortOrder', label: 'Orden', align: 'right', class: 'w-20' },
]

const dialogOpen = ref(false)
const editing = ref<CategoryRow | null>(null)
const deletingId = ref<string | null>(null)
const statusingId = ref<string | null>(null)

/** La API no permite borrar con subcategorías o productos: la interfaz lo refleja antes de llamar. */
function canDeleteRow(row: CategoryRow) {
  return row.subcategoryCount === 0 && row.productCount === 0
}

function deleteBlockReason(row: CategoryRow): string | undefined {
  if (row.subcategoryCount > 0) return 'Tiene subcategorías: elimínalas o desactiva la categoría.'
  if (row.productCount > 0) return 'Tiene productos asignados: desactiva la categoría en su lugar.'
  return undefined
}

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(row: CategoryRow) {
  editing.value = row
  dialogOpen.value = true
}

async function onToggleStatus(row: CategoryRow) {
  if (statusingId.value) return
  const next = row.status === 'active' ? 'inactive' : 'active'
  statusingId.value = row.id
  try {
    await request(`/api/admin/categories/${row.id}/status`, { method: 'PATCH', body: { status: next } })
    toast.success(next === 'active' ? 'Categoría activada' : 'Categoría desactivada')
    await refresh()
  } catch (error) {
    toast.error('No se pudo cambiar el estado', toUiError(error).message)
  } finally {
    statusingId.value = null
  }
}

async function onDelete(row: CategoryRow) {
  if (!canDeleteRow(row) || deletingId.value) return
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
