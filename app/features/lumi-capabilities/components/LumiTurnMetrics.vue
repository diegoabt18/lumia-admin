<template>
  <BaseCard class="mb-6" title="Cómo resuelve Lumi" description="Turnos del chat por etapa. Solo contadores: sin el texto de las preguntas ni quién las hizo.">
    <div class="mb-4 inline-flex rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Periodo">
      <button
        v-for="d in TURN_METRICS_DAYS"
        :key="d"
        type="button"
        class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
        :class="days === d ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
        :aria-pressed="days === d"
        @click="days = d"
      >
        {{ d === 1 ? 'Hoy' : `${d} días` }}
      </button>
    </div>

    <div v-if="loading && !metrics" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <BaseSkeleton v-for="n in 4" :key="n" class="h-20 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !metrics" :message="errorMessage" @retry="refresh" />
    <EmptyState v-else-if="metrics && metrics.turns === 0" compact title="Sin turnos en este periodo" description="Las métricas empiezan a contar desde que el Server con la fase G está desplegado." />

    <template v-else-if="metrics">
      <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl bg-lumia-cream/50 p-3">
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/50">Turnos</dt>
          <dd class="font-display text-2xl tabular-nums text-lumia-ink">{{ fmt(metrics.turns) }}</dd>
        </div>
        <div class="rounded-xl bg-lumia-cream/50 p-3">
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/50">Sin modelo</dt>
          <dd class="font-display text-2xl tabular-nums text-lumia-ink">{{ pct(metrics.withoutModelRate) }}</dd>
        </div>
        <div class="rounded-xl bg-lumia-cream/50 p-3">
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/50">Selector por cada 100</dt>
          <dd class="font-display text-2xl tabular-nums text-lumia-ink">{{ metrics.selectorCallsPer100 === null ? '—' : metrics.selectorCallsPer100.toFixed(0) }}</dd>
        </div>
        <div class="rounded-xl bg-lumia-cream/50 p-3">
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/50">Latencia del selector</dt>
          <dd class="font-display text-2xl tabular-nums text-lumia-ink">{{ metrics.selectorLatencyMsAvg === null ? '—' : `${(metrics.selectorLatencyMsAvg / 1000).toFixed(1)} s` }}</dd>
        </div>
      </dl>

      <ul class="mt-4 space-y-2" aria-label="Turnos por etapa">
        <li v-for="stage in TURN_STAGES" :key="stage" class="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3 text-[13px]">
          <span class="truncate text-lumia-ink/75" :title="TURN_STAGE_LABELS[stage].hint">{{ TURN_STAGE_LABELS[stage].label }}</span>
          <span class="h-2 overflow-hidden rounded-full bg-lumia-ink/[0.06]" aria-hidden="true">
            <span class="block h-full rounded-full bg-lumia-gold/70" :style="{ width: `${share(metrics.stages[stage] ?? 0)}%` }" />
          </span>
          <span class="text-right tabular-nums text-lumia-ink/70">{{ fmt(metrics.stages[stage] ?? 0) }}</span>
        </li>
      </ul>

      <p class="mt-4 text-[12px] text-lumia-ink/50">
        <template v-if="metrics.selectorCalls">
          Selector: {{ fmt(metrics.selectorCalls) }} llamadas, {{ fmt(metrics.selectorErrors) }} con error,
          {{ fmt(metrics.selectorCallsWithExamples) }} con ejemplos aprendidos<template v-if="metrics.selectorPromptTokensAvg !== null">
            · {{ metrics.selectorPromptTokensAvg.toFixed(0) }} tokens de entrada y {{ (metrics.selectorCompletionTokensAvg ?? 0).toFixed(0) }} de salida de media</template>.
        </template>
        <template v-else>El selector no se usó en este periodo (puede estar desactivado en el Server).</template>
        Capacidades que faltan detectadas: {{ fmt(metrics.interpretations.missing_capability ?? 0) }}.
      </p>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { TURN_METRICS_DAYS, TURN_STAGE_LABELS, TURN_STAGES, turnMetricsSchema } from '#shared/schemas/lumi-capabilities'

const { request } = useAdminApi()
const days = ref<(typeof TURN_METRICS_DAYS)[number]>(7)

const { data: metrics, status, error, refresh } = useAsyncData(
  'admin-lumi-turn-metrics',
  () => request<unknown>('/api/admin/lumi/capabilities/metrics', { query: { days: days.value } }).then((raw) => turnMetricsSchema.parse(raw)),
  { watch: [days] },
)
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(n)
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`)
function share(n: number): number {
  const total = metrics.value?.turns ?? 0
  return total ? Math.round((n / total) * 100) : 0
}
</script>
