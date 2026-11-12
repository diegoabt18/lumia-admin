<template>
  <div>
    <div v-if="fetchStatus === 'pending' && !detail" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !detail"
      :title="loadError.status === 404 ? 'Categoría no encontrada' : 'No se pudo cargar la categoría'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      retryable
      @retry="refresh"
    />

    <template v-else-if="detail">
      <PageHeader
        :eyebrow="'Categoría'"
        :title="category.name"
        :description="category.description || 'Subcategorías de esta categoría. Los productos se asignan a una subcategoría.'"
      >
        <template #actions>
          <BaseButton v-if="canUpdate" variant="secondary" @click="openEditCategory">Editar categoría</BaseButton>
          <BaseButton v-if="canUpdate" variant="secondary" :loading="statusBusy" :disabled="statusBusy" @click="toggleCategoryStatus">
            {{ category.status === 'active' ? 'Desactivar categoría' : 'Activar categoría' }}
          </BaseButton>
          <BaseButton v-if="canCreate" @click="openCreateSub">
            <template #icon>
              <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
            </template>
            Nueva subcategoría
          </BaseButton>
        </template>
      </PageHeader>

      <div class="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-lumia-ink/60">
        <BaseBadge :tone="category.status === 'active' ? 'positive' : 'neutral'">
          {{ category.status === 'active' ? 'Activa' : 'Inactiva' }}
        </BaseBadge>
        <span>{{ category.subcategoryCount }} subcategoría(s)</span>
        <span aria-hidden="true">·</span>
        <span>{{ category.productCount }} producto(s)</span>
        <span aria-hidden="true">·</span>
        <span>Orden {{ category.sortOrder }}</span>
      </div>

      <BaseCard :padded="false">
        <div class="space-y-4 p-4 sm:p-5">
          <DataTable
            :columns="columns"
            :rows="detail.subcategories"
            :row-key="(row) => row.id"
            caption="Subcategorías"
            empty-title="Aún no hay subcategorías"
            empty-description="Crea una subcategoría para poder asignarle productos."
          >
            <template #cell-name="{ row }">
              <span class="font-medium text-lumia-ink">{{ row.name }}</span>
              <p v-if="row.description" class="mt-0.5 line-clamp-1 text-[12px] text-lumia-ink/55">{{ row.description }}</p>
            </template>
            <template #cell-status="{ row }">
              <BaseBadge :tone="row.status === 'active' ? 'positive' : 'neutral'">
                {{ row.status === 'active' ? 'Activa' : 'Inactiva' }}
              </BaseBadge>
            </template>
            <template #cell-productCount="{ row }">
              <BaseBadge :tone="row.productCount ? 'neutral' : 'warning'">{{ row.productCount }}</BaseBadge>
            </template>
            <template v-if="canUpdate || canDelete" #actions="{ row }">
              <BaseButton v-if="canUpdate" variant="ghost" size="sm" @click="openEditSub(row)">
                <template #icon>
                  <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
                </template>
                <span class="sr-only md:not-sr-only">Editar</span>
              </BaseButton>
              <BaseButton
                v-if="canUpdate"
                variant="ghost"
                size="sm"
                :disabled="subStatusingId === row.id"
                :loading="subStatusingId === row.id"
                @click="toggleSubStatus(row)"
              >
                <span class="sr-only md:not-sr-only">{{ row.status === 'active' ? 'Desactivar' : 'Activar' }}</span>
              </BaseButton>
              <BaseButton
                v-if="canDelete"
                variant="ghost"
                size="sm"
                :disabled="row.productCount > 0 || subDeletingId === row.id"
                :loading="subDeletingId === row.id"
                :title="row.productCount > 0 ? 'Tiene productos asignados: reasígnalos o desactiva la subcategoría.' : undefined"
                @click="onDeleteSub(row)"
              >
                <template #icon>
                  <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
                </template>
                <span class="sr-only md:not-sr-only">Eliminar</span>
              </BaseButton>
            </template>
          </DataTable>
        </div>
      </BaseCard>

      <CategoryFormDialog
        v-model:open="categoryDialogOpen"
        kind="category"
        :item="categoryDialogItem"
        @saved="refresh"
      />
      <CategoryFormDialog
        v-model:open="subDialogOpen"
        kind="subcategory"
        :category-id="category.id"
        :item="subDialogItem"
        @saved="refresh"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { CategoryDetail, CategoryRow, SubcategoryRow } from '#shared/schemas/categories'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Categoría',
  permissions: [PERMISSIONS.CATEGORIES_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Categorías', to: '/categories' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canCreate = computed(() => auth.can(PERMISSIONS.CATEGORIES_CREATE))
const canUpdate = computed(() => auth.can(PERMISSIONS.CATEGORIES_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.CATEGORIES_DELETE))

const { data: detail, status: fetchStatus, error, refresh } = useAsyncData<CategoryDetail>(
  () => `admin-category-${id.value}`,
  () => request<CategoryDetail>(`/api/admin/categories/${id.value}`),
)
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
const category = computed<CategoryRow>(() => detail.value!.category)

useHead({ title: () => (detail.value ? `${detail.value.category.name} · Lumia Admin` : 'Categoría · Lumia Admin') })

const columns: TableColumn[] = [
  { key: 'name', label: 'Subcategoría' },
  { key: 'status', label: 'Estado', class: 'w-28' },
  { key: 'productCount', label: 'Productos', align: 'right', class: 'w-28' },
  { key: 'sortOrder', label: 'Orden', align: 'right', class: 'w-20' },
]

const categoryDialogOpen = ref(false)
const categoryDialogItem = ref<CategoryRow | null>(null)
const statusBusy = ref(false)

function openEditCategory() {
  categoryDialogItem.value = category.value
  categoryDialogOpen.value = true
}

async function toggleCategoryStatus() {
  if (statusBusy.value) return
  const next = category.value.status === 'active' ? 'inactive' : 'active'
  statusBusy.value = true
  try {
    await request(`/api/admin/categories/${category.value.id}/status`, { method: 'PATCH', body: { status: next } })
    toast.success(next === 'active' ? 'Categoría activada' : 'Categoría desactivada')
    await refresh()
  } catch (err) {
    toast.error('No se pudo cambiar el estado', toUiError(err).message)
  } finally {
    statusBusy.value = false
  }
}

const subDialogOpen = ref(false)
const subDialogItem = ref<SubcategoryRow | null>(null)
const subStatusingId = ref<string | null>(null)
const subDeletingId = ref<string | null>(null)

function openCreateSub() {
  subDialogItem.value = null
  subDialogOpen.value = true
}

function openEditSub(row: SubcategoryRow) {
  subDialogItem.value = row
  subDialogOpen.value = true
}

async function toggleSubStatus(row: SubcategoryRow) {
  if (subStatusingId.value) return
  const next = row.status === 'active' ? 'inactive' : 'active'
  subStatusingId.value = row.id
  try {
    await request(`/api/admin/subcategories/${row.id}/status`, { method: 'PATCH', body: { status: next } })
    toast.success(next === 'active' ? 'Subcategoría activada' : 'Subcategoría desactivada')
    await refresh()
  } catch (err) {
    toast.error('No se pudo cambiar el estado', toUiError(err).message)
  } finally {
    subStatusingId.value = null
  }
}

async function onDeleteSub(row: SubcategoryRow) {
  if (row.productCount > 0 || subDeletingId.value) return
  const ok = await confirm({
    title: `Eliminar "${row.name}"`,
    description: 'La subcategoría se eliminará de forma permanente. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  subDeletingId.value = row.id
  try {
    await request(`/api/admin/subcategories/${row.id}`, { method: 'DELETE' })
    toast.success('Subcategoría eliminada')
    await refresh()
  } catch (err) {
    toast.error('No se pudo eliminar la subcategoría', toUiError(err).message)
  } finally {
    subDeletingId.value = null
  }
}
</script>
