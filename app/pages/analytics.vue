<template>
  <div>
    <PageHeader eyebrow="General" title="Analítica" description="Ventas de la tienda online y del POS, calculadas por el servidor al consultar.">
      <template #actions>
        <div class="inline-flex rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Periodo">
          <button
            v-for="p in ANALYTICS_PERIODS"
            :key="p"
            type="button"
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
            :class="period === p ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
            :aria-pressed="period === p"
            :disabled="loading"
            @click="setPeriod(p)"
          >
            {{ ANALYTICS_PERIOD_LABELS[p] }}
          </button>
        </div>
      </template>
    </PageHeader>

    <ErrorState v-if="loadError && !report" :message="loadError.message" :request-id="loadError.requestId" @retry="refresh" />

    <div v-else class="space-y-6" :aria-busy="loading">
      <p v-if="report" class="text-[12px] text-lumia-ink/55">
        {{ formatDateTime(report.from ?? '') }} – {{ formatDateTime(report.to ?? '') }} · comparado con los {{ ANALYTICS_PERIOD_LABELS[report.period] }} anteriores
      </p>

      <section aria-label="Indicadores del periodo" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas" :value="report ? formatCurrency(report.revenue.current) : '—'" :caption="report ? growthCaption(report.revenue) : undefined" :icon="IconCash" :loading="loading && !report" />
        <StatCard label="Pedidos vendidos" :value="report ? formatNumber(report.soldOrders) : '—'" :caption="report ? `${formatNumber(report.orders.current)} pedidos creados (todos los estados)` : undefined" :icon="IconClipboardCheck" :loading="loading && !report" />
        <StatCard label="Ticket promedio" :value="report?.averageTicket != null ? formatCurrency(report.averageTicket) : '—'" caption="Ventas ÷ pedidos vendidos" :icon="IconReceipt" :loading="loading && !report" />
        <StatCard label="Cuentas nuevas" :value="report ? formatNumber(report.newAccounts.current) : '—'" :caption="report ? growthCaption(report.newAccounts) : undefined" :icon="IconUserPlus" :loading="loading && !report" />
      </section>

      <BaseCard title="Evolución de las ventas" description="Pedidos pagados, enviados o entregados, por fecha de creación.">
        <BaseSkeleton v-if="!report" class="h-[240px] w-full" />
        <RevenueChart v-else :days="report.revenueByDay" :period="report.period" />
      </BaseCard>

      <div class="grid gap-6 lg:grid-cols-2">
        <BaseCard title="Productos más vendidos" description="Top 10 por ventas del periodo.">
          <BaseSkeleton v-if="!report" class="h-40 w-full" />
          <BarList
            v-else
            :items="report.topProducts.map((p) => ({ key: p.slug, label: `${p.name} · ${formatNumber(p.units)} u.`, value: p.revenue, display: formatCurrency(p.revenue) }))"
          />
        </BaseCard>

        <div class="space-y-6">
          <BaseCard title="Pedidos por estado" description="Todos los pedidos creados en el periodo.">
            <BaseSkeleton v-if="!report" class="h-32 w-full" />
            <BarList
              v-else
              :items="report.ordersByStatus.map((s) => ({ key: s.status, label: statusLabel(s.status), value: s.count }))"
            />
          </BaseCard>
          <BaseCard title="Pedidos por método de pago" description="Número de pedidos (no montos), en todos los estados.">
            <BaseSkeleton v-if="!report" class="h-32 w-full" />
            <BarList
              v-else
              :items="report.ordersByPaymentMethod.map((m) => ({ key: m.method, label: PAYMENT_METHOD_LABELS[m.method] ?? m.method, value: m.count }))"
            />
          </BaseCard>
        </div>
      </div>

      <BaseCard title="Cómo se calcula">
        <ul class="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-lumia-ink/70">
          <li>Las ventas suman el total de los pedidos pagados, enviados o entregados, sin descontar devoluciones<template v-if="report && report.refundsTotal > 0"> (reembolsado en el periodo: {{ formatCurrency(report.refundsTotal) }})</template>.</li>
          <li>Los días se agrupan en hora UTC: un pedido hecho después de las 7:00 p. m. en Colombia cuenta en el día siguiente.</li>
          <li>"Cuentas nuevas" incluye todas las cuentas creadas, también las del personal.</li>
          <li>La variación aparece solo cuando el periodo anterior tiene datos.</li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCash, IconClipboardCheck, IconReceipt, IconUserPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  ANALYTICS_PERIOD_LABELS,
  ANALYTICS_PERIODS,
  PAYMENT_METHOD_LABELS,
  type AnalyticsPeriod,
  type AnalyticsReport,
  type Comparison,
} from '#shared/schemas/analytics'
import { ORDER_STATUS_LABELS } from '#shared/schemas/orders'

definePageMeta({
  layout: 'admin',
  title: 'Analítica',
  permissions: [PERMISSIONS.ANALYTICS_READ],
  breadcrumbs: [{ label: 'General' }, { label: 'Analítica' }],
})

const route = useRoute()
const router = useRouter()
const { request } = useAdminApi()

const period = computed<AnalyticsPeriod>(() => {
  const v = route.query.period
  return (ANALYTICS_PERIODS as readonly unknown[]).includes(v) ? (v as AnalyticsPeriod) : '30d'
})
function setPeriod(p: AnalyticsPeriod) {
  void router.replace({ query: { ...route.query, period: p === '30d' ? undefined : p } })
}

const { data: report, status, error, refresh } = useAsyncData<AnalyticsReport>(
  'admin-analytics',
  () => request<AnalyticsReport>('/api/admin/analytics', { query: { period: period.value } }),
  { watch: [period] },
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))

function growthCaption(c: Comparison) {
  if (c.growth === null) return 'Sin datos del periodo anterior'
  const sign = c.growth > 0 ? '+' : ''
  return `${sign}${c.growth} % vs. periodo anterior`
}

function statusLabel(status: string) {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? status
}
</script>
