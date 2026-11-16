<template>
  <div class="space-y-6">
    <!-- Lanzar pruebas -->
    <div v-if="canTest" class="space-y-4">
      <form novalidate class="space-y-3" @submit.prevent="startSingle">
        <FormField :id="`${formId}-single`" label="Probar una frase" :error="singleError ?? undefined" hint="Recorre el mismo camino que el chat, con tus permisos. Solo lee datos.">
          <template #default="{ id, invalid, describedBy }">
            <div class="flex flex-col gap-2 sm:flex-row">
              <BaseInput :id="id" v-model="singleText" maxlength="500" class="flex-1" :invalid="invalid" :described-by="describedBy" :disabled="busy" />
              <BaseButton type="submit" size="sm" :loading="starting === 'single'" :disabled="busy">Probar</BaseButton>
            </div>
          </template>
        </FormField>
      </form>
      <div class="flex flex-col gap-3 rounded-xl border border-lumia-ink/[0.07] bg-lumia-cream/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-[13px] text-lumia-ink/70">
          <p class="font-medium text-lumia-ink">Batería</p>
          <p>{{ batteryHint }}</p>
          <p v-if="validationBlocker" role="status" class="mt-1.5 flex items-start gap-1.5 text-status-warning">
            <IconAlertTriangle class="mt-0.5 h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
            {{ validationBlocker }}
          </p>
        </div>
        <BaseButton size="sm" :loading="starting === 'battery'" :disabled="busy || !runnablePhrases" @click="startBattery">
          <template #icon><IconPlayerPlay class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Ejecutar batería
        </BaseButton>
      </div>
      <BaseCheckbox :id="`${formId}-force`" v-model="forceSelector">
        Usar el selector (Qwen) aunque esté desactivado en el chat
      </BaseCheckbox>
      <p class="-mt-2 text-[12px] text-lumia-ink/50">Cada frase que llega al selector tarda unos segundos en el servidor de IA.</p>
    </div>
    <p v-else class="text-[13px] text-lumia-ink/60">Para lanzar pruebas necesitas el permiso «lumi.capabilities.test». Puedes ver los resultados.</p>

    <!-- Ejecución seleccionada -->
    <div v-if="current" class="space-y-3" aria-live="polite">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-lumia-ink">{{ current.kind === 'battery' ? 'Batería' : 'Frase' }} · {{ formatDateTime(current.createdAt) }}</p>
        <BaseBadge :tone="RUN_STATUS_META[current.status]?.tone ?? 'neutral'">{{ RUN_STATUS_META[current.status]?.label ?? current.status }}</BaseBadge>
        <BaseBadge v-if="current.forceSelector" tone="gold">Selector forzado</BaseBadge>
        <BaseSpinner v-if="current.status === 'running'" size="sm" label="Prueba en curso" />
      </div>
      <p v-if="current.summary" class="text-[13px] text-lumia-ink/70">
        <template v-if="current.summary.evaluated">{{ current.summary.passed }} de {{ current.summary.evaluated }} aciertos</template>
        <template v-if="current.summary.validation.total"> · validación {{ percent(current.summary.validation.passed, current.summary.validation.total) }}</template>
        <template v-if="current.summary.critical.total"> · críticas {{ current.summary.critical.passed }}/{{ current.summary.critical.total }}</template>
        <BaseBadge v-if="current.summary.batteryPassed !== null" :tone="current.summary.batteryPassed ? 'positive' : 'danger'" class="ml-2">
          {{ current.summary.batteryPassed ? 'Pasa' : 'No pasa' }}
        </BaseBadge>
        <BaseBadge v-else-if="current.kind === 'battery'" tone="warning" class="ml-2">No valida</BaseBadge>
      </p>
      <p v-if="current.kind === 'battery' && current.summary && current.summary.batteryPassed === null" class="text-[12px] text-status-warning">
        Sin frases de «Validación» la batería solo informa: no puede aprobar la capacidad aunque acierte todo.
      </p>
      <p v-if="current.status === 'running'" class="text-[13px] text-lumia-ink/55">{{ current.results.length }} frases procesadas…</p>
      <p v-if="current.error" role="alert" class="text-[13px] text-status-danger">{{ current.error }}</p>

      <ul class="space-y-2">
        <li v-for="(result, index) in current.results" :key="index" class="rounded-xl border border-lumia-ink/[0.07] bg-white/70">
          <details>
            <summary class="flex cursor-pointer list-none items-start justify-between gap-3 p-3">
              <span class="min-w-0">
                <span class="block text-sm text-lumia-ink/85">«{{ result.text }}»</span>
                <span class="mt-0.5 block text-[12px] text-lumia-ink/55">
                  {{ OUTCOME_LABELS[result.actual.status] ?? result.actual.status }}<template v-if="result.actual.tool"> · {{ TOOL_LABELS[result.actual.tool] ?? result.actual.tool }}</template>
                  <template v-if="result.expected"> — esperado: {{ OUTCOME_LABELS[result.expected.status] }}<template v-if="result.expected.tool"> · {{ TOOL_LABELS[result.expected.tool] ?? result.expected.tool }}</template></template>
                </span>
              </span>
              <BaseBadge :tone="result.passed === null ? 'neutral' : result.passed ? 'positive' : 'danger'">
                {{ result.passed === null ? 'Sin esperado' : result.passed ? 'Acierta' : 'Falla' }}
              </BaseBadge>
            </summary>
            <dl class="space-y-2 border-t border-lumia-ink/[0.06] p-3 text-[13px]">
              <div v-if="result.automation"><dt class="text-[12px] text-lumia-ink/50">Etapa</dt><dd>Orden de recordatorio por reglas ({{ result.automation }}). No se ejecuta en pruebas.</dd></div>
              <template v-if="result.trace">
                <div><dt class="text-[12px] text-lumia-ink/50">Etapa</dt><dd>{{ STAGE_LABELS[result.trace.stage] ?? result.trace.stage }}</dd></div>
                <div v-if="result.trace.selector">
                  <dt class="text-[12px] text-lumia-ink/50">Selector</dt>
                  <dd>
                    <template v-if="result.trace.selector.outcome === 'ok'">
                      {{ formatMs(result.trace.selector.latencyMs) }} · {{ result.trace.selector.promptTokens ?? '—' }} tokens de entrada, {{ result.trace.selector.completionTokens ?? '—' }} de salida
                    </template>
                    <template v-else-if="result.trace.selector.outcome === 'disabled'">Desactivado: el chat pasaría a conversación.</template>
                    <template v-else>Error: {{ result.trace.selector.error }}</template>
                  </dd>
                </div>
                <div v-if="result.trace.selector?.proposal">
                  <dt class="text-[12px] text-lumia-ink/50">Propuesta del modelo → decisión del Server</dt>
                  <dd><pre class="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-lumia-cream/60 p-2 font-mono text-[11px] text-lumia-ink/75">{{ json(result.trace.selector.proposal) }}
→ {{ json(result.trace.selector.normalized) }}</pre></dd>
                </div>
                <div v-if="result.trace.matches.length">
                  <dt class="text-[12px] text-lumia-ink/50">Entrada validada</dt>
                  <dd><pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-lumia-cream/60 p-2 font-mono text-[11px] text-lumia-ink/75">{{ json(result.trace.matches.map((m) => ({ tool: m.tool, input: m.input, denied: m.denied }))) }}</pre></dd>
                </div>
                <div v-if="result.trace.missing.length"><dt class="text-[12px] text-lumia-ink/50">Datos que faltan</dt><dd>{{ result.trace.missing.join(', ') }}</dd></div>
              </template>
              <div><dt class="text-[12px] text-lumia-ink/50">Respuesta</dt><dd>{{ REPLY_LABELS[result.actual.reply] ?? result.actual.reply }}</dd></div>
              <div v-for="exec in result.executions" :key="exec.tool">
                <dt class="text-[12px] text-lumia-ink/50">{{ TOOL_LABELS[exec.tool] ?? exec.tool }}</dt>
                <dd>
                  <template v-if="exec.denied">Sin permiso: no se leyeron datos.</template>
                  <template v-else-if="exec.error">Error: {{ exec.error }}</template>
                  <template v-else>
                    {{ exec.rows }} {{ exec.rows === 1 ? 'resultado' : 'resultados' }} · {{ formatMs(exec.durationMs) }}
                    <span v-if="exec.text" class="mt-1 block whitespace-pre-line text-lumia-ink/65">{{ exec.text }}</span>
                  </template>
                </dd>
              </div>
              <div><dt class="text-[12px] text-lumia-ink/50">Tiempo total</dt><dd>{{ formatMs(result.durationMs) }}</dd></div>
              <p v-if="result.error" class="text-status-danger">{{ result.error }}</p>
            </dl>
          </details>
        </li>
      </ul>
    </div>

    <!-- Historial -->
    <div>
      <p class="mb-2 text-[13px] font-medium text-lumia-ink">Ejecuciones recientes</p>
      <p v-if="runsError" class="text-[13px] text-status-danger">{{ runsError }}</p>
      <p v-else-if="!runs.length" class="text-[13px] text-lumia-ink/55">Todavía no se ha probado esta capacidad.</p>
      <ul v-else class="divide-y divide-lumia-ink/[0.06]">
        <li v-for="run in runs" :key="run.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-lumia-cream/50"
            :class="current?.id === run.id ? 'bg-lumia-cream/70' : ''"
            :aria-pressed="current?.id === run.id"
            @click="openRun(run.id)"
          >
            <span>{{ run.kind === 'battery' ? 'Batería' : 'Frase' }} · {{ formatDateTime(run.createdAt) }}<template v-if="run.summary && run.summary.evaluated"> · {{ run.summary.passed }}/{{ run.summary.evaluated }}</template></span>
            <BaseBadge :tone="run.summary?.batteryPassed === true ? 'positive' : run.summary?.batteryPassed === false ? 'danger' : (RUN_STATUS_META[run.status]?.tone ?? 'neutral')">
              {{ run.summary?.batteryPassed === true ? 'Pasa' : run.summary?.batteryPassed === false ? 'No pasa' : (RUN_STATUS_META[run.status]?.label ?? run.status) }}
            </BaseBadge>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconPlayerPlay } from '@tabler/icons-vue'
import { CAPABILITY_STATUS_META, type CapabilityStatus } from '#shared/schemas/lumi-capabilities'
import {
  OUTCOME_LABELS,
  REPLY_LABELS,
  RUN_STATUS_META,
  runListResponseSchema,
  runResponseSchema,
  STAGE_LABELS,
  TOOL_LABELS,
  type TestRun,
} from '#shared/schemas/lumi-capability-tests'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

const props = defineProps<{
  capabilityId: string
  canTest: boolean
  runnablePhrases: number
  decidesStatus: boolean
  capabilityStatus: CapabilityStatus
  validationCount: number
}>()
const emit = defineEmits<{ finished: [] }>()

/** Espejo de BATTERY_STATUSES del Server: la batería solo decide el estado desde aquí. */
const BATTERY_STATUSES: readonly CapabilityStatus[] = ['ready_for_testing', 'testing', 'failed', 'validated']

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()

const singleText = ref('')
const singleError = ref<string | null>(null)
const forceSelector = ref(false)
const starting = ref<'single' | 'battery' | null>(null)
const current = ref<TestRun | null>(null)
const busy = computed(() => Boolean(starting.value) || current.value?.status === 'running')

const batteryHint = computed(() => {
  if (!props.runnablePhrases) return 'Añade frases de prueba o de validación para ejecutarla.'
  const base = `${props.runnablePhrases} ${props.runnablePhrases === 1 ? 'frase' : 'frases'} (las de control no se ejecutan aquí).`
  return props.decidesStatus ? `${base} El resultado decide si la capacidad queda validada o fallida.` : base
})

/** Por qué una batería no va a poder validar la capacidad (espejo de las reglas del Server). */
const validationBlocker = computed<string | null>(() => {
  if (props.capabilityStatus === 'enabled') return null
  if (!props.validationCount) {
    return 'La batería se ejecuta, pero no puede validar: ninguna frase tiene el rol «Validación». Cambia el rol de al menos una.'
  }
  if (!BATTERY_STATUSES.includes(props.capabilityStatus)) {
    return `La batería no cambia el estado mientras la capacidad esté «${CAPABILITY_STATUS_META[props.capabilityStatus].label}». Pásala antes a «Lista para probar» con los botones de arriba.`
  }
  return null
})

const { data: runList, error: runListError, refresh: refreshRuns } = useAsyncData(
  () => `admin-lumi-capability-runs-${props.capabilityId}`,
  () => request<unknown>(`/api/admin/lumi/capabilities/${props.capabilityId}/test-runs`).then((raw) => runListResponseSchema.parse(raw)),
)
const runs = computed(() => runList.value?.items ?? [])
const runsError = computed(() => (runListError.value ? toUiError(runListError.value).message : null))

let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

async function loadRun(runId: string): Promise<TestRun> {
  const raw = await request<unknown>(`/api/admin/lumi/capabilities/${props.capabilityId}/test-runs/${runId}`)
  return runResponseSchema.parse(raw).run
}

/** Consulta cada 2 s mientras la ejecución sigue en curso. */
function poll(runId: string) {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    try {
      const run = await loadRun(runId)
      if (current.value?.id !== runId) return
      current.value = run
      if (run.status === 'running') return poll(runId)
      await refreshRuns()
      emit('finished')
      if (run.status === 'done') toast.success(run.kind === 'battery' ? 'Batería terminada' : 'Prueba terminada')
      else toast.error('La prueba no terminó', RUN_STATUS_META[run.status]?.label)
    } catch (e) {
      toast.error('No se pudo consultar la prueba', toUiError(e).message)
    }
  }, 2000)
}

async function openRun(runId: string) {
  clearTimeout(timer)
  try {
    current.value = await loadRun(runId)
    if (current.value.status === 'running') poll(runId)
  } catch (e) {
    toast.error('No se pudo abrir la ejecución', toUiError(e).message)
  }
}

async function start(body: Record<string, unknown>, kind: 'single' | 'battery') {
  starting.value = kind
  try {
    const { run } = runResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capabilityId}/test-runs`, { method: 'POST', body }),
    )
    current.value = run
    await refreshRuns()
    poll(run.id)
    return true
  } catch (e) {
    toast.error('No se pudo iniciar la prueba', toUiError(e).message)
    return false
  } finally {
    starting.value = null
  }
}

async function startSingle() {
  const text = singleText.value.trim()
  singleError.value = text.length < 2 ? 'Escribe una frase.' : null
  if (singleError.value) return
  if (await start({ kind: 'single', text, forceSelector: forceSelector.value }, 'single')) singleText.value = ''
}

async function startBattery() {
  await start({ kind: 'battery', forceSelector: forceSelector.value }, 'battery')
}

function percent(passed: number, total: number): string {
  return `${Math.round((passed / total) * 100)} %`
}
function formatMs(ms: number | undefined): string {
  if (ms === undefined) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
}
function json(value: unknown): string {
  return JSON.stringify(value, null, 1)
}
</script>
