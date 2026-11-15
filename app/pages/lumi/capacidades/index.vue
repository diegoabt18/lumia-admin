<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Capacidades"
      description="Lo que el equipo le pide a Lumi y todavía no sabe hacer. Lumi no usa otra herramienta parecida: registra la petición aquí para evaluarla."
    >
      <template #actions>
        <BaseButton variant="secondary" size="sm" :loading="loading" @click="refreshAll">
          <template #icon>
            <IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          </template>
          Actualizar
        </BaseButton>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Por revisar" :value="statValue(toReview)" :icon="IconInbox" caption="Detectadas o en revisión" :loading="statsLoading" />
      <StatCard label="En marcha" :value="statValue(inProgress)" :icon="IconTools" caption="Aprobadas, en desarrollo o listas para probar" :loading="statsLoading" />
      <StatCard label="Peticiones" :value="statValue(stats?.requestsSince)" :icon="IconMessage2" caption="Últimos 7 días" :loading="statsLoading" />
      <StatCard label="Registradas" :value="statValue(stats?.total)" :icon="IconPuzzle" caption="Total, incluidas fusionadas y rechazadas" :loading="statsLoading" />
    </div>
    <p v-if="statsError" role="status" class="-mt-3 mb-6 text-[13px] text-status-danger">No se pudieron cargar los indicadores: {{ statsError }}</p>

    <LumiTurnMetrics />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar capacidades"
          search-placeholder="Título, descripción o frase pedida…"
          @update:search="table.setSearch"
        />
        <!-- Cuatro filtros: rejilla propia en lugar del hueco de filtros del toolbar (pensado para uno o dos). -->
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <BaseSelect :model-value="filters.status" :options="statusOptions" aria-label="Filtrar por estado" @update:model-value="(v) => setFilter('status', v)" />
          <BaseSelect :model-value="filters.module" :options="moduleOptions" aria-label="Filtrar por módulo" @update:model-value="(v) => setFilter('module', v)" />
          <BaseSelect :model-value="filters.priority" :options="priorityOptions" aria-label="Filtrar por prioridad" @update:model-value="(v) => setFilter('priority', v)" />
          <BaseSelect :model-value="filters.sort" :options="sortOptions" aria-label="Ordenar" @update:model-value="(v) => setFilter('sort', v === 'recent' ? '' : v)" />
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Capacidades que faltan"
          :empty-title="hasFilters ? 'Sin coincidencias' : 'Aún no hay capacidades registradas'"
          :empty-description="hasFilters ? 'Prueba con otros filtros.' : 'Se registran cuando Lumi recibe una petición que ninguna de sus herramientas resuelve (requiere el selector activado en el Server).'"
          @retry="refresh"
        >
          <template #cell-title="{ row }">
            <NuxtLink :to="`/lumi/capacidades/${row.id}`" class="font-medium text-lumia-ink hover:text-lumia-gold">
              {{ row.title }}
            </NuxtLink>
            <BaseBadge v-if="row.possibleDuplicateOf && row.status !== 'duplicate'" tone="warning" class="ml-2">Posible duplicado</BaseBadge>
            <BaseBadge v-if="row.priority === 'high'" tone="danger" class="ml-2">Prioridad alta</BaseBadge>
            <span v-if="row.samples.length" class="mt-0.5 hidden max-w-[16rem] truncate xl:block text-[12px] text-lumia-ink/45">«{{ row.samples[row.samples.length - 1] }}»</span>
          </template>
          <template #cell-module="{ row }">
            <span class="text-[13px] text-lumia-ink/70">{{ CAPABILITY_MODULE_LABELS[row.module] }}</span>
          </template>
          <template #cell-requestCount="{ row }">
            <span class="tabular-nums">{{ row.requestCount }}</span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="CAPABILITY_STATUS_META[row.status].tone">{{ CAPABILITY_STATUS_META[row.status].label }}</BaseBadge>
          </template>
          <template #cell-lastSeenAt="{ row }">
            <span class="text-[13px] text-lumia-ink/60">{{ formatDateTime(row.lastSeenAt) }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton :to="`/lumi/capacidades/${row.id}`" variant="ghost" size="sm">
              <template #icon>
                <IconChevronRight class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only">Ver capacidad {{ row.title }}</span>
            </BaseButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="capacidades"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconChevronRight, IconInbox, IconMessage2, IconPuzzle, IconRefresh, IconTools } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  CAPABILITY_MODULE_LABELS,
  CAPABILITY_MODULES,
  CAPABILITY_PRIORITIES,
  CAPABILITY_PRIORITY_META,
  CAPABILITY_SORT_LABELS,
  CAPABILITY_SORTS,
  CAPABILITY_STATUS_META,
  CAPABILITY_STATUSES,
  capabilityStatsSchema,
  type CapabilityStatus,
  type CapabilitySummary,
} from '#shared/schemas/lumi-capabilities'
import { formatDateTime } from '~/features/lumi-admin/utils/format'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Capacidades de Lumi',
  permissions: [PERMISSIONS.LUMI_CAPABILITIES_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Capacidades' }],
})

const route = useRoute()
const router = useRouter()
const { request } = useAdminApi()
const table = useTableQuery({ allowedLimits: [20, 50, 100] })

type FilterKey = 'status' | 'module' | 'priority' | 'sort'
const ALLOWED: Record<FilterKey, readonly string[]> = {
  status: CAPABILITY_STATUSES,
  module: CAPABILITY_MODULES,
  priority: CAPABILITY_PRIORITIES,
  sort: CAPABILITY_SORTS,
}
/** Filtros desde la URL, solo con valores de la lista blanca. */
const filters = computed<Record<FilterKey, string>>(() => {
  const pick = (key: FilterKey) => {
    const raw = route.query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' && ALLOWED[key].includes(value) ? value : ''
  }
  return { status: pick('status'), module: pick('module'), priority: pick('priority'), sort: pick('sort') || 'recent' }
})
const hasFilters = computed(
  () => Boolean(table.search.value || filters.value.status || filters.value.module || filters.value.priority),
)
function setFilter(key: FilterKey, value: string) {
  void router.replace({ query: { ...route.query, [key]: value || undefined, page: undefined } })
}

const statusOptions = [{ value: '', label: 'Todos los estados' }, ...CAPABILITY_STATUSES.map((s) => ({ value: s, label: CAPABILITY_STATUS_META[s].label }))]
const moduleOptions = [{ value: '', label: 'Todos los módulos' }, ...CAPABILITY_MODULES.map((m) => ({ value: m, label: CAPABILITY_MODULE_LABELS[m] }))]
const priorityOptions = [{ value: '', label: 'Toda prioridad' }, ...CAPABILITY_PRIORITIES.map((p) => ({ value: p, label: CAPABILITY_PRIORITY_META[p].label }))]
const sortOptions = CAPABILITY_SORTS.map((s) => ({ value: s, label: CAPABILITY_SORT_LABELS[s] }))

const { rows, pagination, loading, errorMessage, refresh } = useServerList<CapabilitySummary>(
  'admin-lumi-capabilities',
  '/api/admin/lumi/capabilities',
  table,
  computed(() => ({
    status: filters.value.status || undefined,
    module: filters.value.module || undefined,
    priority: filters.value.priority || undefined,
    sort: filters.value.sort === 'recent' ? undefined : filters.value.sort,
  })),
)

const columns: TableColumn[] = [
  { key: 'title', label: 'Capacidad' },
  { key: 'module', label: 'Módulo', hideOnMobile: true },
  { key: 'requestCount', label: 'Pedida', align: 'right' },
  { key: 'status', label: 'Estado' },
  { key: 'lastSeenAt', label: 'Última vez', hideOnMobile: true },
]

const {
  data: stats,
  status: statsStatus,
  error: statsFetchError,
  refresh: refreshStats,
} = useAsyncData('admin-lumi-capability-stats', () =>
  request<unknown>('/api/admin/lumi/capabilities/stats').then((raw) => capabilityStatsSchema.parse(raw)),
)
const statsLoading = computed(() => statsStatus.value === 'pending')
const statsError = computed(() => (statsFetchError.value ? toUiError(statsFetchError.value).message : null))

function countOf(statuses: readonly CapabilityStatus[]): number | undefined {
  if (!stats.value) return undefined
  return statuses.reduce((sum, s) => sum + (stats.value?.byStatus[s] ?? 0), 0)
}
const toReview = computed(() => countOf(['detected', 'pending_review']))
const inProgress = computed(() => countOf(['approved', 'in_development', 'ready_for_testing']))

function statValue(value: number | undefined): string {
  return value === undefined ? '—' : new Intl.NumberFormat('es-CO').format(value)
}

async function refreshAll() {
  await Promise.all([refresh(), refreshStats()])
}
</script>
