<template>
  <BaseCard :padded="false">
    <div class="space-y-4 px-5 py-4">
      <!-- Encabezado: título, estado, fecha y progreso -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1 space-y-1">
          <template v-if="editing">
            <div class="grid gap-2 sm:grid-cols-[1fr_10rem]">
              <BaseInput :id="`goal-title-${goal.id}`" v-model="editTitle" :invalid="Boolean(editError)" aria-label="Título del objetivo" />
              <BaseInput :id="`goal-date-${goal.id}`" v-model="editDate" type="date" aria-label="Fecha límite" />
            </div>
            <p v-if="editError" class="text-[12px] text-status-danger" role="alert">{{ editError }}</p>
          </template>
          <template v-else>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-[15px] font-semibold text-lumia-ink">{{ goal.title }}</h3>
              <BaseBadge :tone="statusTone">{{ STATUS_LABELS[goal.status] }}</BaseBadge>
              <BaseBadge v-if="overdue" tone="warning">Vencido</BaseBadge>
            </div>
            <p v-if="goal.description" class="text-[13px] leading-relaxed text-lumia-ink/70">{{ goal.description }}</p>
          </template>
          <p class="text-[12px] text-lumia-ink/55">
            {{ goal.dueDate ? `Hasta el ${formatDay(goal.dueDate)}` : 'Sin fecha límite' }}
            · Último avance {{ formatDateTime(goal.lastProgressAt) }}
          </p>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <template v-if="editing">
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="editing = false">Cancelar</BaseButton>
            <BaseButton size="sm" :loading="busy" @click="saveEdit">Guardar</BaseButton>
          </template>
          <template v-else-if="goal.status === 'active'">
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="startEdit">Editar</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="setStatus('achieved')">Logrado</BaseButton>
            <BaseButton variant="ghost" size="sm" :disabled="busy" @click="setStatus('abandoned')">Abandonar</BaseButton>
          </template>
          <BaseButton v-else variant="secondary" size="sm" :disabled="busy" @click="setStatus('active')">Reactivar</BaseButton>
        </div>
      </div>

      <div>
        <div class="mb-1 flex items-center justify-between text-[12px] text-lumia-ink/60">
          <span>{{ goal.progress.total ? `${goal.progress.done} de ${goal.progress.total} pasos` : 'Sin pasos todavía' }}</span>
          <span v-if="goal.progress.total">{{ goal.progress.percent }} %</span>
        </div>
        <div
          class="h-1.5 overflow-hidden rounded-full bg-lumia-ink/[0.06]"
          role="progressbar"
          :aria-valuenow="goal.progress.percent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Progreso de ${goal.title}`"
        >
          <div
            class="h-full rounded-full transition-[width] duration-300"
            :class="goal.status === 'achieved' ? 'bg-status-positive' : 'bg-lumia-gold'"
            :style="{ width: `${goal.progress.percent}%` }"
          />
        </div>
        <p v-if="goal.evaluation" class="mt-2 text-[12px]" :class="goal.evaluation.result === 'achieved' ? 'text-status-positive' : 'text-status-warning'">
          Evaluado al vencer ({{ formatDay(goal.evaluation.dueDate) }}): {{ goal.evaluation.done }} de {{ goal.evaluation.total }} pasos hechos.
        </p>
      </div>

      <!-- Pasos -->
      <ul v-if="goal.steps.length" class="space-y-1.5">
        <li v-for="step in goal.steps" :key="step.id" class="group flex items-start justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-lumia-cream/50">
          <div class="min-w-0">
            <BaseCheckbox
              :id="`step-${step.id}`"
              :model-value="step.done"
              :disabled="busy || goal.status !== 'active'"
              @update:model-value="(done: boolean) => toggleStep(step, done)"
            >
              <span :class="{ 'text-lumia-ink/45 line-through': step.done }">{{ step.title }}</span>
            </BaseCheckbox>
            <p class="ml-[26px] flex flex-wrap gap-x-2 text-[11px] text-lumia-ink/50">
              <span v-if="step.origin === 'lumi'">Propuesto por Lumi</span>
              <span v-if="step.remindAt && !step.done">Recordatorio {{ formatDateTime(step.remindAt) }}</span>
              <span v-if="step.doneAt">Hecho {{ formatDateTime(step.doneAt) }}</span>
            </p>
          </div>
          <BaseButton
            v-if="goal.status === 'active'"
            variant="ghost"
            size="sm"
            :disabled="busy"
            :aria-label="`Quitar el paso ${step.title}`"
            @click="removeStep(step)"
          >
            Quitar
          </BaseButton>
        </li>
      </ul>

      <!-- Propuesta de Lumi pendiente de aprobación -->
      <div v-if="plan" class="space-y-3 rounded-xl border border-lumia-gold/30 bg-lumia-gold/[0.06] px-4 py-3" aria-live="polite">
        <p class="text-[13px] font-medium text-lumia-ink">Lumi propone:</p>
        <p class="text-[13px] leading-relaxed text-lumia-ink/80">{{ plan.summary }}</p>
        <p class="text-[11px] text-lumia-ink/50">No se añade nada hasta que lo apruebes. Caduca {{ formatDateTime(plan.expiresAt) }}.</p>
        <div class="flex gap-2">
          <BaseButton size="sm" :loading="busy" @click="resolvePlan('approve')">Añadir estos pasos</BaseButton>
          <BaseButton variant="secondary" size="sm" :disabled="busy" @click="resolvePlan('reject')">Descartar</BaseButton>
        </div>
      </div>

      <!-- Nuevo paso -->
      <form v-if="goal.status === 'active'" class="flex flex-col gap-2 sm:flex-row sm:items-start" @submit.prevent="addStep">
        <div class="flex-1">
          <BaseInput
            :id="`new-step-${goal.id}`"
            v-model="stepTitle"
            placeholder="Nuevo paso"
            :invalid="Boolean(stepError)"
            aria-label="Nuevo paso"
          />
          <p v-if="stepError" class="mt-1 text-[12px] text-status-danger" role="alert">{{ stepError }}</p>
        </div>
        <div class="sm:w-52">
          <BaseInput :id="`new-step-remind-${goal.id}`" v-model="stepRemind" type="datetime-local" aria-label="Recordatorio (opcional)" />
        </div>
        <BaseButton type="submit" variant="secondary" :loading="busy">Añadir</BaseButton>
        <BaseButton variant="ghost" :loading="planning" :disabled="busy || goal.steps.length >= 12" @click="proposePlan">
          Proponer pasos con Lumi
        </BaseButton>
      </form>

      <!-- Historial -->
      <div>
        <button
          type="button"
          class="text-[12px] font-medium text-lumia-ink/60 hover:text-lumia-ink"
          :aria-expanded="showHistory"
          @click="showHistory = !showHistory"
        >
          {{ showHistory ? 'Ocultar seguimiento' : `Ver seguimiento (${goal.events.length})` }}
        </button>
        <ol v-if="showHistory" class="mt-2 space-y-1 rounded-xl bg-lumia-cream/60 px-4 py-3 text-[12px] text-lumia-ink/75">
          <li v-for="(event, i) in goal.events" :key="i">
            <span class="text-lumia-ink/45">{{ formatDateTime(event.at) }}</span> · {{ EVENT_LABELS[event.type] ?? event.type }}<template v-if="event.text">: {{ event.text }}</template>
          </li>
        </ol>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import {
  lumiApprovalResolveResultSchema,
  lumiGoalPlanSchema,
  lumiGoalSchema,
  lumiGoalStepCreateSchema,
  lumiGoalUpdateSchema,
  type LumiGoal,
  type LumiGoalPlan,
  type LumiGoalStep,
} from '#shared/schemas/lumi'
import { DEFAULT_LUMI_TIMEZONE } from '#shared/schemas/lumi-automation'
import { zonedLocalToIso } from '#shared/utils/datetime'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

const props = defineProps<{ goal: LumiGoal; today: string }>()
const emit = defineEmits<{ updated: [goal: LumiGoal]; refresh: [] }>()

const STATUS_LABELS: Record<LumiGoal['status'], string> = { active: 'Activo', achieved: 'Logrado', abandoned: 'Abandonado' }
const EVENT_LABELS: Record<string, string> = {
  created: 'Creado',
  updated: 'Editado',
  step_added: 'Paso añadido',
  step_done: 'Paso hecho',
  step_reopened: 'Paso reabierto',
  step_removed: 'Paso quitado',
  plan_applied: 'Plan aprobado',
  evaluated: 'Evaluado',
  reminded: 'Aviso de Lumi',
  status: 'Estado',
}

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const busy = ref(false)
const planning = ref(false)
const showHistory = ref(false)

const statusTone = computed(() => (props.goal.status === 'achieved' ? 'positive' : props.goal.status === 'abandoned' ? 'neutral' : 'info'))
const overdue = computed(() => props.goal.status === 'active' && props.goal.dueDate !== null && props.goal.dueDate < props.today)

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)),
  )
}

/** Ejecuta una acción que devuelve el objetivo actualizado. */
async function run(label: string, action: () => Promise<unknown>): Promise<boolean> {
  busy.value = true
  try {
    emit('updated', lumiGoalSchema.parse(await action()))
    return true
  } catch (e) {
    toast.error(label, toUiError(e).message)
    return false
  } finally {
    busy.value = false
  }
}

// ─── Edición ─────────────────────────────────────────────────────────────────
const editing = ref(false)
const editTitle = ref('')
const editDate = ref('')
const editError = ref<string | null>(null)

function startEdit() {
  editTitle.value = props.goal.title
  editDate.value = props.goal.dueDate ?? ''
  editError.value = null
  editing.value = true
}

async function saveEdit() {
  const parsed = lumiGoalUpdateSchema.safeParse({ title: editTitle.value, dueDate: editDate.value || null })
  if (!parsed.success) {
    editError.value = parsed.error.issues[0]?.message ?? 'Revisa los datos'
    return
  }
  const ok = await run('No se pudo guardar', () => request(`/api/admin/lumi/goals/${props.goal.id}`, { method: 'PATCH', body: parsed.data }))
  if (ok) editing.value = false
}

async function setStatus(status: LumiGoal['status']) {
  if (status === 'abandoned') {
    const ok = await confirm({
      title: '¿Abandonar este objetivo?',
      description: 'Se cierran los recordatorios de sus pasos pendientes. Podrás reactivarlo después.',
      confirmLabel: 'Abandonar',
      tone: 'danger',
    })
    if (!ok) return
  }
  await run('No se pudo cambiar el estado', () => request(`/api/admin/lumi/goals/${props.goal.id}/status`, { method: 'POST', body: { status } }))
}

// ─── Pasos ───────────────────────────────────────────────────────────────────
const stepTitle = ref('')
const stepRemind = ref('')
const stepError = ref<string | null>(null)

async function addStep() {
  const remindAt = stepRemind.value ? zonedLocalToIso(stepRemind.value, DEFAULT_LUMI_TIMEZONE) : undefined
  const parsed = lumiGoalStepCreateSchema.safeParse({ title: stepTitle.value, ...(remindAt ? { remindAt } : {}) })
  if (!parsed.success || remindAt === null) {
    stepError.value = parsed.success ? 'Fecha del recordatorio inválida' : (parsed.error.issues[0]?.message ?? 'Revisa el paso')
    return
  }
  stepError.value = null
  const ok = await run('No se pudo añadir el paso', () =>
    request(`/api/admin/lumi/goals/${props.goal.id}/steps`, { method: 'POST', body: parsed.data }),
  )
  if (ok) {
    stepTitle.value = ''
    stepRemind.value = ''
  }
}

async function toggleStep(step: LumiGoalStep, done: boolean) {
  await run('No se pudo actualizar el paso', () =>
    request(`/api/admin/lumi/goals/${props.goal.id}/steps/${step.id}`, { method: 'PATCH', body: { done } }),
  )
}

async function removeStep(step: LumiGoalStep) {
  await run('No se pudo quitar el paso', () => request(`/api/admin/lumi/goals/${props.goal.id}/steps/${step.id}`, { method: 'DELETE' }))
}

// ─── Plan de Lumi ────────────────────────────────────────────────────────────
const plan = ref<LumiGoalPlan | null>(null)

async function proposePlan() {
  planning.value = true
  try {
    plan.value = lumiGoalPlanSchema.parse(await request(`/api/admin/lumi/goals/${props.goal.id}/plan`, { method: 'POST' }))
  } catch (e) {
    toast.error('Lumi no pudo proponer pasos', toUiError(e).message)
  } finally {
    planning.value = false
  }
}

async function resolvePlan(decision: 'approve' | 'reject') {
  const current = plan.value
  if (!current) return
  busy.value = true
  try {
    const result = lumiApprovalResolveResultSchema.parse(
      await request(`/api/admin/lumi/approvals/${current.approvalId}/resolve`, {
        method: 'POST',
        body: { decision, paramsHash: current.paramsHash },
      }),
    )
    plan.value = null
    if (decision === 'approve') toast.success(result.text)
    emit('refresh')
  } catch (e) {
    toast.error('No se pudo resolver la propuesta', toUiError(e).message)
    // Ya resuelta o caducada: se quita para no ofrecer un botón que no sirve.
    plan.value = null
  } finally {
    busy.value = false
  }
}

</script>
