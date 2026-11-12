<template>
  <div>
    <PageHeader
      eyebrow="Resumen"
      title="Dashboard"
      description="Indicadores calculados por el servidor de Lumia en el momento de la consulta."
    >
      <template #actions>
        <BaseButton variant="secondary" size="sm" :loading="refreshing" @click="onRefresh">
          <template #icon>
            <IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          </template>
          Actualizar
        </BaseButton>
      </template>
    </PageHeader>

    <ErrorState
      v-if="error && !stats"
      :message="error.message"
      :request-id="error.requestId"
      :retrying="refreshing"
      @retry="onRefresh"
    />

    <div v-else class="space-y-6">
      <section aria-label="Indicadores principales" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas acumuladas"
          :value="stats ? formatCurrency(stats.counts.paidSalesTotal) : '—'"
          caption="Pedidos pagados, enviados o entregados (histórico)"
          :icon="IconCash"
          :loading="loading"
        />
        <StatCard
          label="Pedidos"
          :value="stats ? formatNumber(stats.counts.orders) : '—'"
          caption="Total registrado"
          :icon="IconClipboardList"
          :loading="loading"
        />
        <StatCard
          label="Productos"
          :value="stats ? formatNumber(stats.counts.products) : '—'"
          :caption="stats ? `${formatNumber(stats.counts.activeProducts)} activos` : undefined"
          :icon="IconBoxSeam"
          :loading="loading"
        />
        <StatCard
          label="Promociones activas"
          :value="stats ? formatNumber(stats.counts.activePromotions) : '—'"
          caption="Vigentes en este momento"
          :icon="IconRosetteDiscount"
          :loading="loading"
        />
      </section>

      <div class="grid gap-6 lg:grid-cols-3">
        <BaseCard
          class="lg:col-span-2"
          title="Más vendidos"
          description="Unidades vendidas acumuladas por producto."
        >
          <DataTable
            v-model:sort="sort"
            :columns="columns"
            :rows="sortedTopSelling"
            :row-key="(row) => row.key"
            :loading="loading"
            caption="Productos más vendidos"
            empty-title="Aún no hay ventas registradas"
          />
        </BaseCard>

        <BaseCard title="Equipo y sesiones" description="Cuentas marcadas como staff y sesiones activas.">
          <dl class="space-y-4">
            <div class="flex items-center justify-between">
              <dt class="text-sm text-lumia-ink/60">Usuarios staff</dt>
              <dd>
                <BaseSkeleton v-if="loading" class="h-5 w-10" />
                <span v-else class="font-display text-2xl tabular-nums text-lumia-ink">{{ stats ? formatNumber(stats.counts.staff) : '—' }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-sm text-lumia-ink/60">Sesiones activas</dt>
              <dd>
                <BaseSkeleton v-if="loading" class="h-5 w-10" />
                <span v-else class="font-display text-2xl tabular-nums text-lumia-ink">{{ stats ? formatNumber(stats.counts.activeSessions) : '—' }}</span>
              </dd>
            </div>
          </dl>
        </BaseCard>
      </div>

      <section aria-label="Alertas" class="grid gap-6 lg:grid-cols-3">
        <AlertList
          title="Sin stock"
          description="Productos activos sin unidades disponibles."
          :items="stats?.alerts.outOfStock ?? []"
          empty-title="Todo el catálogo tiene stock"
          tone="danger"
          :loading="loading"
        />
        <AlertList
          title="Promociones por vencer"
          description="Vencen en las próximas 72 horas."
          :items="stats?.alerts.promotionsExpiringSoon ?? []"
          empty-title="Ninguna promoción vence pronto"
          tone="warning"
          detail-is-date
          :loading="loading"
        />
        <AlertList
          title="Categorías vacías"
          description="Categorías sin productos asociados."
          :items="stats?.alerts.emptyCategories ?? []"
          empty-title="Todas las categorías tienen productos"
          tone="info"
          :loading="loading"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconBoxSeam, IconCash, IconClipboardList, IconRefresh, IconRosetteDiscount } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { SortState, TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Dashboard',
  permissions: [PERMISSIONS.ADMIN_ACCESS],
  breadcrumbs: [{ label: 'Dashboard' }],
})

const { stats, loading: initialLoading, error, refresh } = useDashboardStats()
const toast = useToast()
const refreshing = ref(false)
const loading = computed(() => initialLoading.value && !stats.value)

async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refresh()
    if (error.value) toast.error('No se pudo actualizar el dashboard', error.value.message)
  } finally {
    refreshing.value = false
  }
}

const columns: TableColumn[] = [
  { key: 'label', label: 'Producto', sortable: true },
  { key: 'units', label: 'Unidades', sortable: true, align: 'right', class: 'tabular-nums w-32' },
]

const sort = ref<SortState | null>({ key: 'units', direction: 'desc' })

/** Orden en el cliente: la lista es corta (top 6 calculado por el Server). */
const sortedTopSelling = computed(() => {
  const rows = (stats.value?.topSelling ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    units: item.value,
  }))
  const current = sort.value
  if (!current) return rows
  const factor = current.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (current.key === 'units') return ((a.units ?? -1) - (b.units ?? -1)) * factor
    return a.label.localeCompare(b.label, 'es') * factor
  })
})
</script>
