<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Iniciativas"
      description="Propuestas que Lumi detecta en la tienda. Decides qué hacer con cada una: Lumi no cambia nada por su cuenta."
    />

    <BaseCard class="mb-6">
      <div class="grid gap-4 p-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
        <FormField id="initiative-level" label="Nivel de avisos" hint="Cuántas iniciativas te notifican en el momento.">
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect
              :id="id"
              :model-value="level ?? ''"
              :options="levelOptions"
              :invalid="invalid"
              :described-by="describedBy"
              :disabled="levelSaving || !level"
              @update:model-value="onLevelChange"
            />
          </template>
        </FormField>
        <p class="pt-1 text-[13px] leading-relaxed text-lumia-ink/60">
          {{ level ? INITIATIVE_LEVEL_LABELS[level].description : 'Cargando nivel…' }}
        </p>
      </div>
    </BaseCard>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-lumia-ink/60">{{ countLabel }}</p>
      <div class="w-full sm:w-56">
        <BaseSelect v-model="stateFilter" :options="stateOptions" aria-label="Filtrar por estado" />
      </div>
    </div>

    <div v-if="loading && !items.length" class="grid gap-4 md:grid-cols-2">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-44 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState
        title="Sin iniciativas por ahora"
        description="Cuando Lumi detecte algo que conviene revisar, aparecerá aquí. Las iniciativas se generan si tienes una revisión diaria de iniciativas activa."
      />
    </BaseCard>

    <ul v-else class="grid gap-4 md:grid-cols-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex flex-col gap-3 rounded-2xl border border-lumia-ink/[0.07] bg-white/80 p-5 shadow-soft"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-medium leading-snug text-lumia-ink">{{ item.title }}</p>
          <BaseBadge :tone="INITIATIVE_PRIORITY[item.priority].tone">{{ INITIATIVE_PRIORITY[item.priority].label }}</BaseBadge>
        </div>
        <p class="text-[13px] leading-relaxed text-lumia-ink/70">{{ item.detail }}</p>
        <p class="text-[12px] text-lumia-ink/45">
          <span>{{ initiativeStateLabel(item.state) }}</span>
          · Última detección: {{ formatDateTime(item.lastSeenAt) }}
          <span v-if="item.openCount > 1"> · Abierta {{ item.openCount }} veces</span>
        </p>

        <div v-if="actionsFor(item.state).length" class="mt-auto flex flex-wrap gap-2 pt-1">
          <BaseButton
            v-for="target in actionsFor(item.state)"
            :key="target"
            :variant="target === 'rechazada' || target === 'descartada' ? 'ghost' : 'secondary'"
            size="sm"
            :loading="busyId === item.id && pendingState === target"
            :disabled="Boolean(busyId)"
            @click="onChangeState(item, target)"
          >
            {{ ACTION_LABELS[target] }}
          </BaseButton>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  INITIATIVE_LEVEL_LABELS,
  INITIATIVE_LEVELS,
  INITIATIVE_STATE_LABELS,
  INITIATIVE_STATES,
  INITIATIVE_USER_TRANSITIONS,
  initiativeListResponseSchema,
  initiativeSettingsResponseSchema,
  initiativeSchema,
  type InitiativeLevel,
  type InitiativeRow,
  type InitiativeState,
} from '#shared/schemas/lumi-initiatives'
import { formatDateTime, INITIATIVE_PRIORITY, initiativeStateLabel } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Iniciativas',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Iniciativas' }],
})

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const ACTION_LABELS: Record<InitiativeState, string> = {
  nueva: 'Nueva',
  pendiente: 'Dejar pendiente',
  en_revision: 'Revisar',
  aceptada: 'Aceptar',
  rechazada: 'Rechazar',
  completada: 'Marcar completada',
  descartada: 'Descartar',
}
/** Acciones que piden confirmación: no se pueden deshacer desde la interfaz. */
const CONFIRM_STATES: readonly InitiativeState[] = ['rechazada', 'descartada']

const stateFilter = ref<string>('')
const stateOptions = [
  { value: '', label: 'Todas' },
  ...INITIATIVE_STATES.map((s) => ({ value: s, label: INITIATIVE_STATE_LABELS[s] })),
]
const levelOptions = INITIATIVE_LEVELS.map((l) => ({ value: l, label: INITIATIVE_LEVEL_LABELS[l].label }))

const { data, status, error, refresh } = useAsyncData(
  'admin-lumi-initiatives',
  () =>
    request<unknown>('/api/admin/lumi/initiatives', {
      query: { state: stateFilter.value || undefined, limit: 50 },
    }).then((raw) => initiativeListResponseSchema.parse(raw)),
  { watch: [stateFilter] },
)
const items = computed<InitiativeRow[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))
const countLabel = computed(() => {
  const n = items.value.length
  return n === 1 ? '1 iniciativa' : `${n} iniciativas`
})

function actionsFor(state: InitiativeState): InitiativeState[] {
  return [...INITIATIVE_USER_TRANSITIONS[state]]
}

const busyId = ref<string | null>(null)
const pendingState = ref<InitiativeState | null>(null)

async function onChangeState(item: InitiativeRow, target: InitiativeState) {
  if (CONFIRM_STATES.includes(target)) {
    const ok = await confirm({
      title: target === 'rechazada' ? 'Rechazar iniciativa' : 'Descartar iniciativa',
      description: `«${item.title}» dejará de avisarte. Lumi no volverá a proponerla mientras la condición siga igual.`,
      confirmLabel: ACTION_LABELS[target],
      tone: 'danger',
    })
    if (!ok) return
  }
  busyId.value = item.id
  pendingState.value = target
  try {
    initiativeSchema.parse(
      await request<unknown>(`/api/admin/lumi/initiatives/${item.id}/state`, { method: 'POST', body: { state: target } }),
    )
    toast.success(`Iniciativa: ${INITIATIVE_STATE_LABELS[target].toLowerCase()}`)
    await refresh()
  } catch (e) {
    toast.error('No se pudo cambiar el estado', toUiError(e).message)
  } finally {
    busyId.value = null
    pendingState.value = null
  }
}

const { data: settings } = useAsyncData('admin-lumi-initiative-settings', () =>
  request<unknown>('/api/admin/lumi/initiatives/settings').then((raw) => initiativeSettingsResponseSchema.parse(raw)),
)
const level = ref<InitiativeLevel | null>(null)
const levelSaving = ref(false)
watch(
  () => settings.value?.level,
  (value) => {
    if (value) level.value = value
  },
  { immediate: true },
)

async function onLevelChange(value: string) {
  const next = INITIATIVE_LEVELS.find((l) => l === value)
  if (!next || next === level.value) return
  const previous = level.value
  level.value = next
  levelSaving.value = true
  try {
    await request('/api/admin/lumi/initiatives/settings', { method: 'PUT', body: { level: next } })
    toast.success(`Nivel de avisos: ${INITIATIVE_LEVEL_LABELS[next].label.toLowerCase()}`)
  } catch (e) {
    level.value = previous
    toast.error('No se pudo guardar el nivel', toUiError(e).message)
  } finally {
    levelSaving.value = false
  }
}
</script>
