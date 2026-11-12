<template>
  <div>
    <PageHeader eyebrow="Producción" title="Materiales" description="Insumos con su unidad de compra, costo vigente y stock.">
      <template v-if="canCreate" #actions>
        <BaseButton @click="createOpen = true">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nuevo material
        </BaseButton>
      </template>
    </PageHeader>
    <ProductionTabs />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar materiales" search-placeholder="Nombre o código…" @update:search="table.setSearch">
          <template #filters>
            <label :for="categoryId" class="sr-only">Categoría</label>
            <BaseSelect :id="categoryId" :model-value="category" :options="categoryOptions" placeholder="Todas las categorías" class="w-52" @update:model-value="setCategory" />
            <BaseCheckbox :id="activeId" :model-value="activeOnly" @update:model-value="setActiveOnly">Solo activos</BaseCheckbox>
          </template>
        </TableToolbar>
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Materiales"
          :empty-title="table.search.value || category || activeOnly ? 'Sin coincidencias' : 'Aún no hay materiales'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/production/materials/${row.id}`" class="group block min-w-0">
              <span class="block truncate font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name }}</span>
              <span v-if="row.code" class="block truncate font-mono text-[11px] text-lumia-ink/45">{{ row.code }}</span>
            </NuxtLink>
          </template>
          <template #cell-category="{ row }">{{ categoryLabel(row.category) }}</template>
          <template #cell-lastCost="{ row }">
            <span v-if="row.lastCost > 0" class="tabular-nums">{{ formatUnitCost(row.lastCost) }} <span class="text-[12px] text-lumia-ink/50">/ {{ row.purchaseUnit }}</span></span>
            <span v-else class="text-[12px] text-status-warning">Sin costo</span>
          </template>
          <template #cell-stock="{ row }">
            <span v-if="!row.stockEnabled" class="text-[12px] text-lumia-ink/45">—</span>
            <span v-else class="inline-flex items-center gap-1.5 tabular-nums" :class="row.lowStock ? 'text-status-danger' : 'text-lumia-ink/75'">
              {{ row.stockCurrent ?? 0 }} {{ row.stockUnit ?? '' }}
              <BaseBadge v-if="row.lowStock" tone="danger">Bajo</BaseBadge>
            </span>
          </template>
          <template #cell-active="{ row }">
            <BaseBadge :tone="row.active ? 'positive' : 'neutral'">{{ row.active ? 'Activo' : 'Inactivo' }}</BaseBadge>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="materiales"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>

    <MaterialCreateDialog v-model:open="createOpen" @created="(id) => navigateTo(`/production/materials/${id}`)" />
  </div>
</template>

<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, type MaterialRow } from '#shared/schemas/production'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Materiales',
  permissions: [PERMISSIONS.MATERIALS_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Materiales' }],
})

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const canCreate = computed(() => auth.can(PERMISSIONS.MATERIALS_CREATE))

const categoryId = useId()
const activeId = useId()
const category = computed(() => {
  const v = route.query.category
  return typeof v === 'string' && (MATERIAL_CATEGORIES as readonly string[]).includes(v) ? v : ''
})
const activeOnly = computed(() => route.query.active === '1')
const categoryOptions = MATERIAL_CATEGORIES.map((c) => ({ value: c, label: MATERIAL_CATEGORY_LABELS[c] }))
const categoryLabel = (c: string) => (MATERIAL_CATEGORY_LABELS as Record<string, string>)[c] ?? c

function patchQuery(values: Record<string, string | undefined>) {
  void router.replace({ query: { ...route.query, ...values, page: undefined } })
}
const setCategory = (v: string) => patchQuery({ category: v || undefined })
const setActiveOnly = (v: boolean) => patchQuery({ active: v ? '1' : undefined })

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<MaterialRow>(
  'admin-production-materials',
  '/api/admin/production/materials',
  table,
  computed(() => ({ category: category.value || undefined, active: activeOnly.value ? '1' : undefined })),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Material' },
  { key: 'category', label: 'Categoría', class: 'w-36', hideOnMobile: true },
  { key: 'lastCost', label: 'Costo vigente', align: 'right', class: 'w-44' },
  { key: 'stock', label: 'Stock', class: 'w-36', hideOnMobile: true },
  { key: 'active', label: 'Estado', class: 'w-28' },
]

const createOpen = ref(false)
</script>
