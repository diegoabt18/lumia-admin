<template>
  <div>
    <PageHeader eyebrow="Producción" title="Recetas" description="Materiales que consume cada producto, su costo y el precio sugerido.">
      <template v-if="canCreate" #actions>
        <BaseButton to="/production/recipes/new">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nueva receta
        </BaseButton>
      </template>
    </PageHeader>
    <ProductionTabs />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar recetas" search-placeholder="Receta o producto…" @update:search="table.setSearch">
          <template #filters>
            <BaseCheckbox :id="outdatedId" :model-value="outdatedOnly" @update:model-value="setOutdated">Solo desactualizadas</BaseCheckbox>
          </template>
        </TableToolbar>
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Recetas"
          :empty-title="table.search.value || outdatedOnly ? 'Sin coincidencias' : 'Aún no hay recetas'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/production/recipes/${row.id}`" class="group block min-w-0">
              <span class="block truncate font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name }}</span>
              <span class="block truncate text-[12px] text-lumia-ink/50">{{ row.productName || row.productSlug }} · v{{ row.version }} · {{ row.lineCount }} material(es)</span>
            </NuxtLink>
          </template>
          <template #cell-totalCost="{ row }">
            <span class="tabular-nums">{{ formatUnitCost(row.totalCost) }}</span>
          </template>
          <template #cell-suggestedPrice="{ row }">
            <span class="tabular-nums">{{ row.suggestedPrice !== null ? formatCurrency(row.suggestedPrice) : '—' }}</span>
          </template>
          <template #cell-status="{ row }">
            <div class="flex flex-wrap gap-1">
              <BaseBadge v-if="row.costsOutdated" tone="warning">Desactualizada</BaseBadge>
              <BaseBadge v-if="!row.isActive" tone="neutral">Inactiva</BaseBadge>
              <BaseBadge v-if="row.isActive && !row.costsOutdated" tone="positive">Al día</BaseBadge>
            </div>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="recetas"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { RecipeRow } from '#shared/schemas/recipes'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Recetas',
  permissions: [PERMISSIONS.RECIPES_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Recetas' }],
})

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const canCreate = computed(() => auth.can(PERMISSIONS.RECIPES_CREATE))

const outdatedId = useId()
const outdatedOnly = computed(() => route.query.outdated === '1')
function setOutdated(value: boolean) {
  void router.replace({ query: { ...route.query, outdated: value ? '1' : undefined, page: undefined } })
}

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<RecipeRow>(
  'admin-production-recipes',
  '/api/admin/production/recipes',
  table,
  computed(() => ({ outdated: outdatedOnly.value ? '1' : undefined })),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Receta' },
  { key: 'totalCost', label: 'Costo', align: 'right', class: 'w-36' },
  { key: 'suggestedPrice', label: 'Precio sugerido', align: 'right', class: 'w-40', hideOnMobile: true },
  { key: 'status', label: 'Estado', class: 'w-40' },
]
</script>
