<template>
  <div>
    <PageHeader eyebrow="Producción" title="Precios" description="Productos con receta: asignación de recetas y envío del precio sugerido a aprobación." />
    <ProductionTabs />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar productos" search-placeholder="Nombre o slug…" @update:search="table.setSearch">
          <template #filters>
            <label :for="statusId" class="sr-only">Estado</label>
            <BaseSelect :id="statusId" :model-value="status" :options="statusOptions" placeholder="Todos los estados" class="w-56" @update:model-value="setStatus" />
          </template>
        </TableToolbar>
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Productos y estado de sus precios"
          :empty-title="table.search.value || status ? 'Sin coincidencias' : 'No hay productos'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/production/pricing/${row.id}`" class="group block min-w-0">
              <span class="block truncate font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name }}</span>
              <span class="block truncate font-mono text-[11px] text-lumia-ink/45">{{ row.slug }} · {{ row.variantCount }} variante(s)</span>
            </NuxtLink>
          </template>
          <template #cell-recipe="{ row }">
            <span v-if="row.recipeName" class="text-lumia-ink/80">{{ row.recipeName }} <span class="text-[12px] text-lumia-ink/45">v{{ row.recipeVersion }}</span></span>
            <span v-else-if="row.variantRecipeCount" class="text-[12px] text-lumia-ink/60">Por variante ({{ row.variantRecipeCount }})</span>
            <span v-else class="text-[12px] text-lumia-ink/45">—</span>
          </template>
          <template #cell-status="{ row }">
            <div class="flex flex-wrap gap-1">
              <BaseBadge :tone="STATUS_TONES[row.repostStatus]">{{ REPOST_STATUS_LABELS[row.repostStatus] }}</BaseBadge>
              <BaseBadge v-if="row.variantsNeedingRepost" tone="warning">{{ row.variantsNeedingRepost }} por enviar</BaseBadge>
              <BaseBadge v-if="row.variantsPendingApproval" tone="info">{{ row.variantsPendingApproval }} en aprobación</BaseBadge>
            </div>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="productos"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { REPOST_STATUS_LABELS, REPOST_STATUSES, type PricingProductRow, type RepostStatus } from '#shared/schemas/costing'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Precios',
  permissions: [PERMISSIONS.RECIPES_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Precios' }],
})

const route = useRoute()
const router = useRouter()
const statusId = useId()
const status = computed(() => {
  const v = route.query.status
  return typeof v === 'string' && (REPOST_STATUSES as readonly string[]).includes(v) ? v : ''
})
const statusOptions = REPOST_STATUSES.map((s) => ({ value: s, label: REPOST_STATUS_LABELS[s] }))
function setStatus(value: string) {
  void router.replace({ query: { ...route.query, status: value || undefined, page: undefined } })
}

const STATUS_TONES: Record<RepostStatus, 'neutral' | 'positive' | 'warning' | 'info' | 'gold'> = {
  no_recipe: 'neutral',
  up_to_date: 'positive',
  needs_repost: 'warning',
  pending_approval: 'info',
  mixed: 'gold',
}

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<PricingProductRow>(
  'admin-production-pricing',
  '/api/admin/production/pricing/products',
  table,
  computed(() => ({ status: status.value || undefined })),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Producto' },
  { key: 'recipe', label: 'Receta', hideOnMobile: true },
  { key: 'status', label: 'Precio', class: 'w-64' },
]
</script>
