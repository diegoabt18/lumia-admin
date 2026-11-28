<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Aprobaciones"
      description="Acciones que Lumi preparó y que no hará sin tu permiso. Cada una se aprueba una sola vez: las que pides en el chat caducan a los 10 minutos y las que Lumi propone, a los 7 días."
    >
      <template #actions>
        <div class="inline-flex rounded-xl border border-lumia-ink/10 bg-white p-1" role="tablist" aria-label="Filtro">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            role="tab"
            :aria-selected="filter === option.value"
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
            :class="filter === option.value ? 'bg-lumia-ink text-white' : 'text-lumia-ink/65 hover:text-lumia-ink'"
            @click="filter = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading && !items.length" class="space-y-3">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-24 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState
        :title="filter === 'pending' ? 'Nada esperando tu aprobación' : 'Aún no hay aprobaciones'"
        description="Cuando Lumi necesite tu permiso para borrar una rutina, actuar en un equipo o crear una automatización que te propone, aparecerá aquí."
      />
    </BaseCard>

    <BaseCard v-else>
      <ul class="divide-y divide-lumia-ink/[0.05]">
        <li v-for="item in items" :key="item.id" class="space-y-3 px-5 py-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-lumia-ink">{{ capitalize(item.summary) }}</p>
                <BaseBadge :tone="statusOf(item).tone">{{ statusOf(item).label }}</BaseBadge>
              </div>
              <p class="text-[12px] text-lumia-ink/55">
                {{ kindLabel(item.kind) }} · {{ item.kind === 'create_automation' || item.kind === 'goal_plan' ? 'Propuesta' : 'Pedida' }} {{ formatDateTime(item.createdAt) }}
                <template v-if="item.status === 'pending'"> · Caduca {{ formatDateTime(item.expiresAt) }}</template>
                <template v-else-if="item.resolvedAt"> · {{ viaLabel(item.via) }} {{ formatDateTime(item.resolvedAt) }}</template>
              </p>
              <p v-if="item.outcome" class="text-[13px] leading-relaxed text-lumia-ink/75">
                {{ item.outcome.text }}
              </p>
            </div>

            <div v-if="item.status === 'pending'" class="flex shrink-0 items-center gap-2">
              <BaseButton
                variant="secondary"
                size="sm"
                :disabled="Boolean(busyId)"
                :loading="busyId === item.id && busyDecision === 'reject'"
                @click="resolve(item, 'reject')"
              >
                Rechazar
              </BaseButton>
              <BaseButton
                size="sm"
                :disabled="Boolean(busyId)"
                :loading="busyId === item.id && busyDecision === 'approve'"
                @click="resolve(item, 'approve')"
              >
                Aprobar
              </BaseButton>
            </div>
          </div>

          <BaseCheckbox
            v-if="item.status === 'pending' && item.kind === 'desktop_action'"
            :id="`remember-${item.id}`"
            v-model="remember[item.id]"
          >
            No volver a preguntar para este tipo de acción en este destino y equipo
          </BaseCheckbox>
        </li>
      </ul>
      <p class="border-t border-lumia-ink/[0.05] px-5 py-3 text-[12px] leading-relaxed text-lumia-ink/55">
        Aprobar aquí equivale a responder «sí» en el chat. La respuesta de Lumi se muestra en esta lista, no en la
        conversación donde se pidió.
      </p>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  lumiApprovalListSchema,
  lumiApprovalResolveResultSchema,
  type LumiApproval,
} from '#shared/schemas/lumi'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Aprobaciones',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Aprobaciones' }],
})

type BadgeTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info'
type Filter = 'pending' | 'all'

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'all', label: 'Historial' },
]

const { request } = useAdminApi()
const toast = useToast()

const filter = ref<Filter>('pending')
const { data, status, error, refresh } = useAsyncData(
  'admin-lumi-approvals',
  async () =>
    lumiApprovalListSchema.parse(
      await request<unknown>('/api/admin/lumi/approvals', { query: { status: filter.value } }),
    ),
  { watch: [filter] },
)

const items = computed<LumiApproval[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const remember = reactive<Record<string, boolean>>({})
const busyId = ref<string | null>(null)
const busyDecision = ref<'approve' | 'reject' | null>(null)

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function kindLabel(kind: LumiApproval['kind']): string {
  if (kind === 'desktop_action') return 'Acción en un equipo'
  if (kind === 'create_automation') return 'Propuesta de Lumi'
  if (kind === 'goal_plan') return 'Pasos para un objetivo'
  return 'Eliminar una rutina'
}

function viaLabel(via: LumiApproval['via']): string {
  if (via === 'api') return 'Resuelta desde Admin'
  if (via === 'button') return 'Resuelta con el botón del chat'
  return 'Resuelta en el chat'
}

function statusOf(item: LumiApproval): { label: string; tone: BadgeTone } {
  switch (item.status) {
    case 'pending':
      return { label: 'Esperando', tone: 'warning' }
    case 'approved':
      return item.outcome?.status === 'error'
        ? { label: 'Aprobada, falló', tone: 'danger' }
        : { label: 'Aprobada', tone: 'positive' }
    case 'rejected':
      return { label: 'Rechazada', tone: 'neutral' }
    case 'superseded':
      return { label: 'Sustituida', tone: 'neutral' }
    case 'expired':
      return { label: 'Caducada', tone: 'neutral' }
  }
}

async function resolve(item: LumiApproval, decision: 'approve' | 'reject') {
  busyId.value = item.id
  busyDecision.value = decision
  try {
    const result = lumiApprovalResolveResultSchema.parse(
      await request<unknown>(`/api/admin/lumi/approvals/${item.id}/resolve`, {
        method: 'POST',
        body: {
          decision,
          remember: decision === 'approve' && item.kind === 'desktop_action' && Boolean(remember[item.id]),
          paramsHash: item.paramsHash,
        },
      }),
    )
    if (result.status === 'approved') toast.success('Aprobada', result.text)
    else toast.info('Rechazada', result.text)
  } catch (e) {
    toast.error('No se pudo resolver', toUiError(e).message)
  } finally {
    busyId.value = null
    busyDecision.value = null
    await refresh()
  }
}
</script>
