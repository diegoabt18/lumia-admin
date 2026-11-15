<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Aprendizaje"
      description="Lo que el equipo le ha enseñado a Lumi con «No era esto» o corrigiendo en el chat. Cada interpretación vale solo para quien la enseñó, salvo que la hagas global."
    >
      <template #actions>
        <BaseButton variant="secondary" size="sm" :loading="loading" @click="refresh()">
          <template #icon><IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Actualizar
        </BaseButton>
      </template>
    </PageHeader>

    <div class="mb-6 rounded-2xl border border-lumia-ink/[0.07] bg-lumia-cream/50 p-4 text-[13px] leading-relaxed text-lumia-ink/70">
      Una interpretación nunca da permisos: si alguien no puede ver ventas, enseñarle a Lumi una frase de ventas no le muestra datos.
      Lumi tampoco reentrena su modelo: solo recuerda «esta frase → esta consulta».
    </div>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar :search="table.search.value" search-label="Buscar frases" search-placeholder="Frase enseñada…" @update:search="table.setSearch" />
        <div class="grid gap-2 sm:grid-cols-2">
          <BaseSelect :model-value="filters.scope" :options="scopeOptions" aria-label="Filtrar por alcance" @update:model-value="(v) => setFilter('scope', v)" />
          <BaseSelect :model-value="filters.status" :options="statusOptions" aria-label="Filtrar por estado" @update:model-value="(v) => setFilter('status', v)" />
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Interpretaciones aprendidas"
          :empty-title="hasFilters ? 'Sin coincidencias' : 'Lumi todavía no ha aprendido nada'"
          :empty-description="hasFilters ? 'Prueba con otros filtros.' : 'Aparecerán cuando alguien use «No era esto» en el chat o corrija una respuesta.'"
          @retry="refresh"
        >
          <template #cell-phrase="{ row }">
            <span class="block text-lumia-ink/85">«{{ row.phrase }}»</span>
            <span class="mt-0.5 block text-[12px] text-lumia-ink/50">{{ KNOWLEDGE_SCOPE_LABELS[row.scope] }} · {{ KNOWLEDGE_SOURCE_LABELS[row.source] ?? row.source }}</span>
          </template>
          <template #cell-tool="{ row }">
            <span class="text-[13px] text-lumia-ink/75">{{ row.toolLabel ?? row.tool }}</span>
            <BaseBadge v-if="!row.toolExists" tone="warning" class="ml-1.5">Ya no existe</BaseBadge>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="KNOWLEDGE_STATUS_META[row.status].tone">{{ KNOWLEDGE_STATUS_META[row.status].label }}</BaseBadge>
          </template>
          <template #cell-uses="{ row }">
            <span class="tabular-nums">{{ row.uses }}</span>
          </template>
          <template #cell-updatedAt="{ row }">
            <span class="text-[13px] text-lumia-ink/60">{{ formatDateTime(row.updatedAt) }}</span>
          </template>
          <template v-if="canManage" #actions="{ row }">
            <div class="flex flex-wrap justify-end gap-1">
              <BaseButton
                v-for="next in KNOWLEDGE_TRANSITIONS[row.status] ?? []"
                :key="next"
                :variant="next === 'approved' ? 'secondary' : 'ghost'"
                size="sm"
                :disabled="Boolean(busyId)"
                :loading="busyId === `${row.id}:${next}`"
                @click="onStatus(row, next)"
              >
                {{ KNOWLEDGE_ACTION_LABELS[next] ?? next }}
              </BaseButton>
              <BaseButton
                v-if="row.scope === 'user' && row.status === 'approved'"
                variant="ghost"
                size="sm"
                :disabled="Boolean(busyId)"
                :loading="busyId === `${row.id}:promote`"
                @click="onPromote(row)"
              >
                Hacer global
              </BaseButton>
              <BaseButton variant="ghost" size="sm" :disabled="Boolean(busyId)" :loading="busyId === `${row.id}:delete`" @click="onDelete(row)">
                <template #icon><IconTrash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                <span class="sr-only">Eliminar «{{ row.phrase }}»</span>
              </BaseButton>
            </div>
          </template>
        </DataTable>

        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="interpretaciones"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconRefresh, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  KNOWLEDGE_ACTION_LABELS,
  KNOWLEDGE_SCOPE_LABELS,
  KNOWLEDGE_SCOPES,
  KNOWLEDGE_SOURCE_LABELS,
  KNOWLEDGE_STATUS_META,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TRANSITIONS,
  knowledgeResponseSchema,
  type Knowledge,
  type KnowledgeStatus,
} from '#shared/schemas/lumi-learning'
import { formatDateTime } from '~/features/lumi-admin/utils/format'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Aprendizaje de Lumi',
  permissions: [PERMISSIONS.LUMI_LEARNING_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Aprendizaje' }],
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const table = useTableQuery({ allowedLimits: [20, 50, 100] })
const canManage = computed(() => auth.can(PERMISSIONS.LUMI_LEARNING_MANAGE))

type FilterKey = 'scope' | 'status'
const ALLOWED: Record<FilterKey, readonly string[]> = { scope: KNOWLEDGE_SCOPES, status: KNOWLEDGE_STATUSES }
const filters = computed<Record<FilterKey, string>>(() => {
  const pick = (key: FilterKey) => {
    const raw = route.query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' && ALLOWED[key].includes(value) ? value : ''
  }
  return { scope: pick('scope'), status: pick('status') }
})
const hasFilters = computed(() => Boolean(table.search.value || filters.value.scope || filters.value.status))
function setFilter(key: FilterKey, value: string) {
  void router.replace({ query: { ...route.query, [key]: value || undefined, page: undefined } })
}
const scopeOptions = [{ value: '', label: 'Todos los alcances' }, ...KNOWLEDGE_SCOPES.map((s) => ({ value: s, label: KNOWLEDGE_SCOPE_LABELS[s] }))]
const statusOptions = [{ value: '', label: 'Todos los estados' }, ...KNOWLEDGE_STATUSES.map((s) => ({ value: s, label: KNOWLEDGE_STATUS_META[s].label }))]

const { rows, pagination, loading, errorMessage, refresh } = useServerList<Knowledge>(
  'admin-lumi-knowledge',
  '/api/admin/lumi/knowledge',
  table,
  computed(() => ({ scope: filters.value.scope || undefined, status: filters.value.status || undefined })),
)

const columns: TableColumn[] = [
  { key: 'phrase', label: 'Frase' },
  { key: 'tool', label: 'Lumi usa', hideOnMobile: false },
  { key: 'status', label: 'Estado' },
  { key: 'uses', label: 'Usos', align: 'right', hideOnMobile: true },
  { key: 'updatedAt', label: 'Actualizada', hideOnMobile: true },
]

const busyId = ref<string | null>(null)

async function run(key: string, action: () => Promise<unknown>, success: string) {
  busyId.value = key
  try {
    await action()
    toast.success(success)
    await refresh()
  } catch (e) {
    toast.error('No se pudo completar', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

async function onStatus(row: Knowledge, next: KnowledgeStatus) {
  if (next === 'rejected' || next === 'deprecated') {
    const ok = await confirm({
      title: next === 'rejected' ? 'Rechazar interpretación' : 'Retirar interpretación',
      description: `Lumi dejará de usar «${row.phrase}» → ${row.toolLabel ?? row.tool}${row.scope === 'global' ? ' para todos' : ''}.`,
      confirmLabel: KNOWLEDGE_ACTION_LABELS[next],
      tone: 'danger',
    })
    if (!ok) return
  }
  await run(
    `${row.id}:${next}`,
    async () =>
      knowledgeResponseSchema.parse(await request<unknown>(`/api/admin/lumi/knowledge/${row.id}/status`, { method: 'POST', body: { status: next } })),
    `Interpretación: ${KNOWLEDGE_STATUS_META[next].label.toLowerCase()}`,
  )
}

async function onPromote(row: Knowledge) {
  const ok = await confirm({
    title: 'Hacer global',
    description: `«${row.phrase}» significará «${row.toolLabel ?? row.tool}» para todo el equipo (cada uno con sus permisos). Si contradice otra global, las dos quedarán en revisión.`,
    confirmLabel: 'Hacer global',
  })
  if (!ok) return
  await run(
    `${row.id}:promote`,
    async () => knowledgeResponseSchema.parse(await request<unknown>(`/api/admin/lumi/knowledge/${row.id}/promote`, { method: 'POST', body: {} })),
    'Interpretación global creada',
  )
}

async function onDelete(row: Knowledge) {
  const ok = await confirm({
    title: 'Eliminar interpretación',
    description: `Se borra «${row.phrase}». El registro de cambios se conserva. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  await run(`${row.id}:delete`, () => request(`/api/admin/lumi/knowledge/${row.id}`, { method: 'DELETE' }), 'Interpretación eliminada')
}
</script>
