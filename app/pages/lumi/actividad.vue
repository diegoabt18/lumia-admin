<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Actividad"
      description="Lo que pide tu atención en Lumi: estado, aprobaciones, errores, tareas, objetivos, iniciativas y dispositivos. Se actualiza cada minuto mientras tienes la página abierta."
    >
      <template #actions>
        <span v-if="activity" class="text-[12px] text-lumia-ink/50">Actualizado {{ formatDateTime(activity.generatedAt) }}</span>
        <BaseButton variant="secondary" size="sm" :loading="loading" @click="refresh()">
          <IconRefresh class="h-4 w-4" aria-hidden="true" />
          Actualizar
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="loading && !activity" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BaseSkeleton v-for="n in 4" :key="n" class="h-24 w-full" />
      </div>
      <BaseSkeleton class="h-64 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !activity" :message="errorMessage" @retry="refresh" />

    <template v-else-if="activity">
      <div
        v-if="activity.unavailable.length"
        class="mb-4 rounded-xl bg-status-warning-soft/60 px-4 py-3 text-[13px] text-status-warning"
        role="status"
      >
        No se pudo consultar: {{ activity.unavailable.map((s) => SECTION_LABELS[s]).join(', ') }}. El resto está al día.
      </div>

      <!-- Resumen -->
      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="tile in tiles"
          :key="tile.label"
          :to="tile.to"
          class="group rounded-2xl border border-lumia-ink/[0.07] bg-white/80 p-4 shadow-soft transition-colors hover:border-lumia-ink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold"
        >
          <p class="text-[12px] font-medium uppercase tracking-wide text-lumia-ink/50">{{ tile.label }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums" :class="tile.alert ? 'text-status-danger' : 'text-lumia-ink'">
            {{ tile.value }}
          </p>
          <p class="mt-0.5 text-[12px] text-lumia-ink/55">{{ tile.hint }}</p>
        </NuxtLink>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Estado -->
        <BaseCard title="Estado" description="Dependencias de Lumi, comprobadas cada minuto.">
          <template #actions>
            <NuxtLink to="/lumi/notificaciones" class="text-[13px] font-medium text-lumia-gold hover:underline">Avisos</NuxtLink>
          </template>
          <SectionUnavailable v-if="!activity.health" />
          <ul v-else class="grid gap-2 sm:grid-cols-3">
            <li v-for="item in activity.health" :key="item.component" class="rounded-xl border border-lumia-ink/[0.06] px-3 py-2.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[13px] font-medium text-lumia-ink">{{ HEALTH_NAMES[item.component] }}</p>
                <BaseBadge :tone="HEALTH_TONES[item.status]">{{ HEALTH_LABELS[item.status] }}</BaseBadge>
              </div>
              <p class="mt-1 text-[12px] text-lumia-ink/55">
                <template v-if="item.status === 'down' && item.since">Desde {{ formatDateTime(item.since) }}</template>
                <template v-else-if="item.lastCheckedAt">{{ formatDateTime(item.lastCheckedAt) }}</template>
                <template v-else>Sin comprobar</template>
              </p>
            </li>
          </ul>
        </BaseCard>

        <!-- Aprobaciones -->
        <BaseCard title="Aprobaciones pendientes" description="Lumi no hará nada de esto sin tu permiso.">
          <template #actions>
            <NuxtLink to="/lumi/aprobaciones" class="text-[13px] font-medium text-lumia-gold hover:underline">Ver todas</NuxtLink>
          </template>
          <SectionUnavailable v-if="!activity.approvals" />
          <EmptyState v-else-if="!activity.approvals.items.length" compact title="Nada esperando tu aprobación" />
          <ul v-else class="divide-y divide-lumia-ink/[0.05]">
            <li v-for="item in activity.approvals.items" :key="item.id" class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="text-[13px] font-medium text-lumia-ink">{{ capitalize(item.summary) }}</p>
                <p class="text-[12px] text-lumia-ink/55">{{ APPROVAL_KIND_LABELS[item.kind] }} · Caduca {{ formatDateTime(item.expiresAt) }}</p>
              </div>
              <div class="flex shrink-0 gap-2">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  :disabled="Boolean(busy)"
                  :loading="busy === `approval:${item.id}:reject`"
                  @click="resolveApproval(item, 'reject')"
                >
                  Rechazar
                </BaseButton>
                <BaseButton
                  size="sm"
                  :disabled="Boolean(busy)"
                  :loading="busy === `approval:${item.id}:approve`"
                  @click="resolveApproval(item, 'approve')"
                >
                  Aprobar
                </BaseButton>
              </div>
            </li>
          </ul>
          <p v-if="activity.approvals && activity.approvals.pending > activity.approvals.items.length" class="mt-3 text-[12px] text-lumia-ink/55">
            Y {{ activity.approvals.pending - activity.approvals.items.length }} más en Aprobaciones.
          </p>
        </BaseCard>

        <!-- Errores -->
        <BaseCard title="Errores recientes" description="Tareas, acciones en equipos y dependencias, últimos 7 días.">
          <template #actions>
            <NuxtLink to="/lumi/automatizaciones" class="text-[13px] font-medium text-lumia-gold hover:underline">Automatizaciones</NuxtLink>
          </template>
          <p v-if="activity.unavailable.includes('errors')" class="mb-3 text-[12px] text-status-warning">
            Puede haber más: no se pudieron revisar todas las ejecuciones.
          </p>
          <EmptyState v-if="!activity.errors.length" compact title="Sin errores en los últimos 7 días" />
          <ul v-else class="divide-y divide-lumia-ink/[0.05]">
            <li v-for="item in activity.errors" :key="item.key" class="py-3 first:pt-0 last:pb-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-[13px] font-medium text-lumia-ink">{{ item.title }}</p>
                <BaseBadge :tone="item.severity === 'final' ? 'danger' : 'warning'">
                  {{ item.severity === 'final' ? 'Falló' : 'Se reintentará' }}
                </BaseBadge>
              </div>
              <p class="mt-0.5 text-[13px] leading-relaxed text-lumia-ink/70">{{ item.message }}</p>
              <p class="mt-0.5 text-[12px] text-lumia-ink/50">
                {{ ERROR_SOURCE_LABELS[item.source] }} · {{ formatDateTime(item.at) }}
                <template v-if="item.deviceId && canSeeDesktop">
                  · <NuxtLink :to="`/desktop/${item.deviceId}`" class="font-medium text-lumia-gold hover:underline">Ver equipo</NuxtLink>
                </template>
              </p>
            </li>
          </ul>
        </BaseCard>

        <!-- Tareas -->
        <BaseCard title="Tareas" description="Próximas ejecuciones y tareas en pausa.">
          <template #actions>
            <NuxtLink to="/lumi/automatizaciones" class="text-[13px] font-medium text-lumia-gold hover:underline">Ver todas</NuxtLink>
          </template>
          <SectionUnavailable v-if="!activity.tasks" />
          <EmptyState v-else-if="!activity.tasks.upcoming.length && !activity.tasks.pausedItems.length" compact title="Sin tareas programadas" />
          <ul v-else class="divide-y divide-lumia-ink/[0.05]">
            <li v-for="task in activity.tasks.upcoming" :key="task.id" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium text-lumia-ink">{{ task.title }}</p>
                <p class="text-[12px] text-lumia-ink/55">{{ kindLabel(task.kind) }} · {{ formatDateTime(task.nextRunAt) }}</p>
              </div>
              <BaseButton
                variant="secondary"
                size="sm"
                :disabled="Boolean(busy)"
                :loading="busy === `task:${task.id}`"
                @click="taskAction(task, 'pause')"
              >
                Pausar
              </BaseButton>
            </li>
            <li v-for="task in activity.tasks.pausedItems" :key="task.id" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium text-lumia-ink/70">{{ task.title }}</p>
                <p class="text-[12px] text-lumia-ink/55">{{ kindLabel(task.kind) }} · <span class="text-status-warning">En pausa</span></p>
              </div>
              <BaseButton
                variant="secondary"
                size="sm"
                :disabled="Boolean(busy)"
                :loading="busy === `task:${task.id}`"
                @click="taskAction(task, 'resume')"
              >
                Reanudar
              </BaseButton>
            </li>
          </ul>
        </BaseCard>

        <!-- Objetivos -->
        <BaseCard title="Objetivos" description="Primero los vencidos y los que llevan una semana sin avances.">
          <template #actions>
            <NuxtLink to="/lumi/objetivos" class="text-[13px] font-medium text-lumia-gold hover:underline">Ver todos</NuxtLink>
          </template>
          <SectionUnavailable v-if="!activity.goals" />
          <EmptyState v-else-if="!activity.goals.items.length" compact title="Sin objetivos activos" />
          <ul v-else class="space-y-3">
            <li v-for="goal in activity.goals.items" :key="goal.id">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-[13px] font-medium text-lumia-ink">{{ goal.title }}</p>
                <BaseBadge v-if="goal.overdue" tone="danger">Vencido</BaseBadge>
                <BaseBadge v-else-if="goal.stalled" tone="warning">Sin avances</BaseBadge>
              </div>
              <div
                class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lumia-ink/[0.06]"
                role="progressbar"
                :aria-valuenow="goal.progress.percent"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Progreso de ${goal.title}`"
              >
                <div class="h-full rounded-full bg-lumia-gold" :style="{ width: `${goal.progress.percent}%` }" />
              </div>
              <p class="mt-1 text-[12px] text-lumia-ink/55">
                {{ goal.progress.done }}/{{ goal.progress.total }} pasos
                <template v-if="goal.dueDate"> · Vence {{ formatDate(goal.dueDate) }}</template>
                <template v-if="goal.nextStep"> · Siguiente: {{ goal.nextStep }}</template>
              </p>
            </li>
          </ul>
        </BaseCard>

        <!-- Iniciativas -->
        <BaseCard title="Iniciativas abiertas" description="Lo que Lumi detectó en la tienda y espera tu decisión.">
          <template #actions>
            <NuxtLink to="/lumi/iniciativas" class="text-[13px] font-medium text-lumia-gold hover:underline">Ver todas</NuxtLink>
          </template>
          <SectionUnavailable v-if="!activity.initiatives" />
          <EmptyState v-else-if="!activity.initiatives.items.length" compact title="Sin iniciativas abiertas" />
          <ul v-else class="divide-y divide-lumia-ink/[0.05]">
            <li v-for="item in activity.initiatives.items" :key="item.id" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium text-lumia-ink">{{ item.title }}</p>
                <p class="text-[12px] text-lumia-ink/55">{{ stateLabel(item.state) }} · {{ formatDateTime(item.lastSeenAt) }}</p>
              </div>
              <BaseBadge :tone="priorityOf(item.priority).tone">{{ priorityOf(item.priority).label }}</BaseBadge>
            </li>
          </ul>
        </BaseCard>

        <!-- Dispositivos -->
        <BaseCard class="lg:col-span-2" title="Dispositivos" description="Teléfonos con LumiChat y equipos con el agente de escritorio.">
          <template #actions>
            <NuxtLink to="/lumi/telefonos" class="text-[13px] font-medium text-lumia-gold hover:underline">Teléfonos</NuxtLink>
            <NuxtLink v-if="canSeeDesktop" to="/desktop" class="text-[13px] font-medium text-lumia-gold hover:underline">Equipos</NuxtLink>
          </template>
          <div class="grid gap-6 md:grid-cols-2">
            <div>
              <h3 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-lumia-ink/50">Teléfonos</h3>
              <SectionUnavailable v-if="!activity.phones" />
              <EmptyState v-else-if="!activity.phones.length" compact title="Ningún teléfono registrado" />
              <ul v-else class="space-y-2">
                <li v-for="phone in activity.phones" :key="phone.id" class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-[13px] font-medium text-lumia-ink">{{ phone.deviceLabel ?? 'Teléfono sin nombre' }}</p>
                    <p class="text-[12px] text-lumia-ink/55">Última vez {{ formatDateTime(phone.lastSeenAt) }}</p>
                  </div>
                  <BaseBadge :tone="phone.receivesPush ? 'positive' : 'neutral'">
                    {{ phone.receivesPush ? 'Recibe avisos' : 'Sin avisos' }}
                  </BaseBadge>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-lumia-ink/50">Equipos</h3>
              <SectionUnavailable v-if="activity.unavailable.includes('desktop')" />
              <p v-else-if="!activity.desktop" class="text-[13px] text-lumia-ink/55">
                {{ canSeeDesktop ? 'El agente de escritorio no está activo en el servidor.' : 'Necesitas permiso para ver los equipos.' }}
              </p>
              <EmptyState v-else-if="!activity.desktop.length" compact title="Ningún equipo activo" />
              <ul v-else class="space-y-2">
                <li v-for="pc in activity.desktop" :key="pc.id" class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <NuxtLink :to="`/desktop/${pc.id}`" class="truncate text-[13px] font-medium text-lumia-ink hover:underline">{{ pc.name }}</NuxtLink>
                    <p class="text-[12px] text-lumia-ink/55">
                      <template v-if="pc.lastSeenAt">Última vez {{ formatDateTime(pc.lastSeenAt) }}</template>
                      <template v-else>Sin conectar todavía</template>
                    </p>
                  </div>
                  <BaseBadge :tone="pc.online ? 'positive' : 'neutral'">{{ pc.online ? 'En línea' : 'Desconectado' }}</BaseBadge>
                </li>
              </ul>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconRefresh } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  lumiActivitySchema,
  lumiApprovalResolveResultSchema,
  type LumiActivity,
  type LumiActivitySection,
  type LumiApproval,
  type LumiHealthComponent,
} from '#shared/schemas/lumi'
import { INITIATIVE_STATES, type InitiativeState } from '#shared/schemas/lumi-initiatives'
import { formatDateTime, INITIATIVE_PRIORITY, initiativeStateLabel, TASK_KIND_LABELS } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Actividad',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Actividad' }],
})

const SectionUnavailable = defineComponent({
  setup: () => () => h('p', { class: 'text-[13px] text-status-warning' }, 'No se pudo consultar ahora. Vuelve a intentarlo en un momento.'),
})

const SECTION_LABELS: Record<LumiActivitySection, string> = {
  health: 'estado',
  approvals: 'aprobaciones',
  tasks: 'tareas',
  goals: 'objetivos',
  initiatives: 'iniciativas',
  errors: 'errores',
  phones: 'teléfonos',
  desktop: 'equipos',
}
const HEALTH_NAMES: Record<LumiHealthComponent['component'], string> = { redis: 'Redis', assistant: 'IA Assistant', ollama: 'Ollama' }
const HEALTH_LABELS: Record<LumiHealthComponent['status'], string> = { ok: 'Responde', down: 'No responde', unknown: 'Sin dato' }
const HEALTH_TONES: Record<LumiHealthComponent['status'], 'positive' | 'danger' | 'neutral'> = {
  ok: 'positive',
  down: 'danger',
  unknown: 'neutral',
}
const APPROVAL_KIND_LABELS: Record<LumiApproval['kind'], string> = {
  delete_routine: 'Eliminar una rutina',
  desktop_action: 'Acción en un equipo',
  create_automation: 'Propuesta de Lumi',
  goal_plan: 'Pasos para un objetivo',
}
const ERROR_SOURCE_LABELS: Record<LumiActivity['errors'][number]['source'], string> = {
  automation: 'Tarea',
  desktop: 'Equipo',
  health: 'Dependencia',
}

type ActivityApproval = NonNullable<LumiActivity['approvals']>['items'][number]

const REFRESH_MS = 60_000
/** Al volver a la pestaña solo se recarga si la foto tiene más de esto. */
const STALE_ON_FOCUS_MS = 30_000

const auth = useAuth()
const canSeeDesktop = computed(() => auth.can(PERMISSIONS.DESKTOP_DEVICES_READ))
const { request } = useAdminApi()
const toast = useToast()

const { data, status, error, refresh } = useAsyncData('admin-lumi-activity', async () =>
  lumiActivitySchema.parse(await request<unknown>('/api/admin/lumi/activity')),
)
const activity = computed(() => data.value ?? null)
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const tiles = computed(() => {
  const a = activity.value
  if (!a) return []
  const errors = a.errors.length
  const goals = a.goals
  const attention = goals ? goals.overdue + goals.stalled : 0
  return [
    {
      label: 'Aprobaciones',
      value: a.approvals ? String(a.approvals.pending) : '—',
      hint: a.approvals?.pending ? 'Esperando tu decisión' : 'Nada pendiente',
      alert: Boolean(a.approvals?.pending),
      to: '/lumi/aprobaciones',
    },
    {
      label: 'Errores',
      value: String(errors),
      hint: 'Últimos 7 días',
      alert: errors > 0,
      to: '/lumi/automatizaciones',
    },
    {
      label: 'Tareas activas',
      value: a.tasks ? String(a.tasks.active) : '—',
      hint: a.tasks?.paused ? `${a.tasks.paused} en pausa` : 'Ninguna en pausa',
      alert: false,
      to: '/lumi/automatizaciones',
    },
    {
      label: 'Objetivos activos',
      value: goals ? String(goals.active) : '—',
      hint: attention ? `${attention} piden atención` : 'Todo en marcha',
      alert: attention > 0,
      to: '/lumi/objetivos',
    },
  ]
})

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function kindLabel(kind: string): string {
  return TASK_KIND_LABELS[kind] ?? kind
}

function stateLabel(state: string): string {
  return (INITIATIVE_STATES as readonly string[]).includes(state) ? initiativeStateLabel(state as InitiativeState) : state
}

function priorityOf(priority: number) {
  return INITIATIVE_PRIORITY[(priority === 1 || priority === 2 || priority === 3 ? priority : 1) as 1 | 2 | 3]
}

/** Fecha local AAAA-MM-DD sin conversión de zona (es una fecha de calendario, no un instante). */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(y!, m! - 1, d!)))
}

const busy = ref<string | null>(null)

async function resolveApproval(item: ActivityApproval, decision: 'approve' | 'reject') {
  busy.value = `approval:${item.id}:${decision}`
  try {
    const result = lumiApprovalResolveResultSchema.parse(
      await request<unknown>(`/api/admin/lumi/approvals/${item.id}/resolve`, {
        method: 'POST',
        body: { decision, remember: false, paramsHash: item.paramsHash },
      }),
    )
    if (result.status === 'approved') toast.success('Aprobada', result.text)
    else toast.info('Rechazada', result.text)
  } catch (e) {
    toast.error('No se pudo resolver', toUiError(e).message)
  } finally {
    busy.value = null
    await refresh()
  }
}

async function taskAction(task: { id: string; title: string }, action: 'pause' | 'resume') {
  busy.value = `task:${task.id}`
  try {
    await request(`/api/admin/lumi/automation/tasks/${task.id}/${action}`, { method: 'POST' })
    toast.success(action === 'pause' ? 'Tarea en pausa' : 'Tarea reanudada', task.title)
  } catch (e) {
    toast.error('No se pudo cambiar la tarea', toUiError(e).message)
  } finally {
    busy.value = null
    await refresh()
  }
}

// Actualización periódica solo con la pestaña visible (sin peticiones en segundo plano).
let timer: ReturnType<typeof setInterval> | null = null
function tick() {
  if (document.visibilityState === 'visible' && !busy.value && status.value !== 'pending') void refresh()
}
function onVisibility() {
  const at = activity.value ? Date.parse(activity.value.generatedAt) : 0
  if (document.visibilityState === 'visible' && Date.now() - at > STALE_ON_FOCUS_MS) tick()
}
onMounted(() => {
  timer = setInterval(tick, REFRESH_MS)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
