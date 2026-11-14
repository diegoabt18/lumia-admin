<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Automatizaciones"
      description="Rutinas y avisos diarios. El servidor los envía aunque cierres el navegador."
    >
      <template #actions>
        <BaseButton @click="openCreate">
          <template #icon><IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" /></template>
          Nueva rutina
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="loading && !routines.length" class="grid gap-4 md:grid-cols-2">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-44 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !routines.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!routines.length">
      <EmptyState title="Aún no tienes rutinas" description="Crea un recordatorio diario o una revisión de iniciativas." />
    </BaseCard>

    <ul v-else class="grid gap-4 md:grid-cols-2">
      <li
        v-for="routine in routines"
        :key="routine.id"
        class="space-y-3 rounded-2xl border border-lumia-ink/[0.07] bg-white/80 p-5 shadow-soft"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-medium text-lumia-ink">{{ routine.title }}</p>
            <p class="text-[12px] text-lumia-ink/50">{{ kindLabel(routine.kind) }}</p>
          </div>
          <BaseBadge :tone="routine.status === 'active' ? 'positive' : 'neutral'">
            {{ routine.status === 'active' ? 'Activa' : 'Pausada' }}
          </BaseBadge>
        </div>

        <div class="space-y-1 text-[13px] text-lumia-ink/70">
          <p>{{ scheduleLabel(routine) }}</p>
          <p v-if="followUpOf(routine)">
            Segundo aviso: todos los días a las {{ followUpClock(routine) }}
          </p>
          <p v-if="routine.status === 'active' && routine.nextRunAt" class="text-lumia-ink/50">
            Próximo aviso: {{ formatDateTime(routine.nextRunAt) }}
          </p>
        </div>

        <div class="flex flex-wrap justify-end gap-1 pt-1">
          <BaseButton variant="ghost" size="sm" :disabled="busyId === routine.id" @click="openEdit(routine)">
            <template #icon><IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Editar
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            :loading="busyId === routine.id"
            :disabled="Boolean(busyId)"
            @click="togglePause(routine)"
          >
            <template #icon>
              <IconPlayerPlay v-if="routine.status === 'paused'" class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              <IconPlayerPause v-else class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
            </template>
            {{ routine.status === 'paused' ? 'Reanudar' : 'Pausar' }}
          </BaseButton>
          <BaseButton variant="ghost" size="sm" :disabled="Boolean(busyId)" @click="onDelete(routine)">
            <template #icon><IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" /></template>
            <span class="sr-only">Eliminar {{ routine.title }}</span>
          </BaseButton>
        </div>
      </li>
    </ul>

    <section class="mt-10" aria-labelledby="executions-title">
      <h2 id="executions-title" class="lumia-eyebrow mb-3">Últimos envíos</h2>
      <BaseCard>
        <p v-if="executionsLoading && !executions.length" class="px-5 py-6 text-sm text-lumia-ink/50">Cargando envíos…</p>
        <p v-else-if="!executions.length" class="px-5 py-6 text-sm text-lumia-ink/50">Todavía no hay envíos.</p>
        <ul v-else class="divide-y divide-lumia-ink/[0.05]">
          <li v-for="item in executions" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm text-lumia-ink">{{ titleOf(item.taskId) }}</p>
              <p class="text-[12px] text-lumia-ink/50">
                {{ formatDateTime(item.scheduledFor) }}
                <span v-if="item.error" class="text-status-danger"> · {{ item.error }}</span>
              </p>
            </div>
            <BaseBadge :tone="executionTone(item.status)">{{ executionLabel(item.status) }}</BaseBadge>
          </li>
        </ul>
      </BaseCard>
    </section>

    <RoutineFormDialog v-model:open="formOpen" :routine="editing" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlayerPause, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { LumiExecutionRow, LumiTaskRow } from '#shared/schemas/lumi-automation'
import { EXECUTION_STATUS_LABELS, formatClock, formatDateTime, scheduleLabel, TASK_KIND_LABELS } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Automatizaciones',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Automatizaciones' }],
})

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const { data, status, error, refresh } = useAsyncData('admin-lumi-tasks', () =>
  request<{ items: LumiTaskRow[] }>('/api/admin/lumi/automation/tasks'),
)
const tasks = computed(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

/** Rutinas de nivel superior, sin segundos avisos ni completadas. */
const routines = computed(() =>
  tasks.value.filter((t) => t.parentTaskId === null && t.kind !== 'follow_up' && t.status !== 'completed'),
)

function followUpOf(routine: LumiTaskRow): LumiTaskRow | undefined {
  return tasks.value.find((t) => t.parentTaskId === routine.id)
}
function followUpClock(routine: LumiTaskRow): string {
  const follow = followUpOf(routine)
  return follow?.schedule.type === 'daily' ? formatClock(follow.schedule.time) : '—'
}
function kindLabel(kind: string): string {
  return TASK_KIND_LABELS[kind] ?? kind
}
function titleOf(taskId: string): string {
  return tasks.value.find((t) => t.id === taskId)?.title ?? 'Aviso eliminado'
}

const { data: execData, status: execStatus, refresh: refreshExecutions } = useAsyncData('admin-lumi-executions', () =>
  request<{ items: LumiExecutionRow[] }>('/api/admin/lumi/automation/executions', { query: { limit: 20 } }),
)
const executions = computed(() => execData.value?.items ?? [])
const executionsLoading = computed(() => execStatus.value === 'pending')
function executionLabel(s: string) {
  return EXECUTION_STATUS_LABELS[s]?.label ?? s
}
function executionTone(s: string) {
  return EXECUTION_STATUS_LABELS[s]?.tone ?? 'neutral'
}

const formOpen = ref(false)
const editing = ref<LumiTaskRow | null>(null)
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(routine: LumiTaskRow) {
  editing.value = routine
  formOpen.value = true
}
function onSaved() {
  void refresh()
  void refreshExecutions()
}

const busyId = ref<string | null>(null)
async function togglePause(routine: LumiTaskRow) {
  const action = routine.status === 'paused' ? 'resume' : 'pause'
  busyId.value = routine.id
  try {
    await request(`/api/admin/lumi/automation/tasks/${routine.id}/${action}`, { method: 'POST' })
    toast.success(action === 'pause' ? 'Rutina pausada' : 'Rutina reanudada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo cambiar la rutina', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

async function onDelete(routine: LumiTaskRow) {
  const ok = await confirm({
    title: 'Eliminar rutina',
    description: `«${routine.title}» y su segundo aviso dejarán de enviarse. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  busyId.value = routine.id
  try {
    await request(`/api/admin/lumi/automation/tasks/${routine.id}`, { method: 'DELETE' })
    toast.success('Rutina eliminada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}
</script>
