<template>
  <div>
    <PageHeader eyebrow="Catálogo" title="Promociones" description="Descuentos por producto o categoría con vigencia programada.">
      <template v-if="canUpdate" #actions>
        <BaseButton to="/promotions/new">
          <template #icon><IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" /></template>
          Nueva promoción
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar promociones" search-placeholder="Buscar por nombre o descripción…" @update:search="table.setSearch">
          <template #filters>
            <div class="inline-flex flex-wrap rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Vigencia">
              <button
                v-for="opt in lifecycleOptions"
                :key="opt.value"
                type="button"
                class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
                :class="lifecycle === opt.value ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
                :aria-pressed="lifecycle === opt.value"
                @click="setLifecycle(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>
        </TableToolbar>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Promociones"
          :empty-title="table.search.value || lifecycle ? 'Sin coincidencias' : 'Aún no hay promociones'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/promotions/${row.id}`" class="font-medium text-lumia-ink hover:text-lumia-gold">{{ row.name }}</NuxtLink>
            <span class="block text-[12px] text-lumia-ink/45">{{ row.scopeSummary }}</span>
          </template>
          <template #cell-lifecycle="{ row }">
            <PromotionLifecycleBadge :lifecycle="row.lifecycle" />
          </template>
          <template #cell-period="{ row }">
            <span class="text-[13px] text-lumia-ink/65">{{ formatDateTime(row.startsAt) }} → {{ formatDateTime(row.endsAt) }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton
              v-if="canUpdate"
              variant="ghost"
              size="sm"
              :loading="busyId === row.id"
              :disabled="Boolean(busyId)"
              @click="toggleActive(row)"
            >
              <template #icon>
                <IconPlayerPause v-if="row.active" class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
                <IconPlayerPlay v-else class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">{{ row.active ? 'Pausar' : 'Activar' }}</span>
            </BaseButton>
            <BaseButton v-if="canUpdate" variant="ghost" size="sm" :disabled="Boolean(busyId)" @click="onDelete(row)">
              <template #icon><IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" /></template>
              <span class="sr-only">Eliminar {{ row.name }}</span>
            </BaseButton>
            <BaseButton :to="`/promotions/${row.id}`" variant="ghost" size="sm">
              <template #icon><IconChevronRight class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
              <span class="sr-only">Ver {{ row.name }}</span>
            </BaseButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="promociones"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconChevronRight, IconPlayerPause, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { PromotionLifecycle, PromotionRow } from '#shared/schemas/promotions'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Promociones',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Promociones' }],
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const canUpdate = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))

const lifecycleOptions: { value: '' | PromotionLifecycle; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'activa', label: 'Vigentes' },
  { value: 'pendiente', label: 'Programadas' },
  { value: 'finalizada', label: 'Finalizadas' },
]
const lifecycle = computed<'' | PromotionLifecycle>(() => {
  const v = route.query.lifecycle
  return v === 'activa' || v === 'pendiente' || v === 'finalizada' ? v : ''
})
function setLifecycle(value: '' | PromotionLifecycle) {
  void router.replace({ query: { ...route.query, lifecycle: value || undefined, page: undefined } })
}

const table = useTableQuery({ allowedLimits: [20, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<PromotionRow>(
  'admin-promotions',
  '/api/admin/promotions',
  table,
  computed(() => ({ lifecycle: lifecycle.value || undefined })),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Promoción' },
  { key: 'lifecycle', label: 'Estado' },
  { key: 'discountSummary', label: 'Descuento', hideOnMobile: true },
  { key: 'period', label: 'Vigencia', hideOnMobile: true },
]

const busyId = ref<string | null>(null)

async function toggleActive(row: PromotionRow) {
  const next = !row.active
  if (!next && !(await confirm({ title: `Pausar "${row.name}"`, description: 'El descuento deja de aplicarse en la tienda de inmediato.', confirmLabel: 'Pausar' }))) return
  busyId.value = row.id
  try {
    await request(`/api/admin/promotions/${row.id}/active`, { method: 'PATCH', body: { active: next } })
    toast.success(next ? 'Promoción activada' : 'Promoción pausada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo cambiar el estado', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

async function onDelete(row: PromotionRow) {
  const ok = await confirm({
    title: `Eliminar "${row.name}"`,
    description: 'La promoción se eliminará de forma permanente. Si solo quieres detenerla, usa Pausar.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  busyId.value = row.id
  try {
    await request(`/api/admin/promotions/${row.id}`, { method: 'DELETE' })
    toast.success('Promoción eliminada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}
</script>
