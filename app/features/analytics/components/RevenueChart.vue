<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="text-[12px] text-lumia-ink/55">{{ bucketLabel }}</p>
      <button
        type="button"
        class="text-[12px] font-medium text-lumia-ink/60 underline-offset-2 hover:text-lumia-ink hover:underline"
        :aria-expanded="showTable"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'Ver gráfico' : 'Ver tabla' }}
      </button>
    </div>

    <div v-if="!showTable" class="relative" @mouseleave="hovered = null">
      <!-- Rejilla y eje Y (recesivos) -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-[220px]" aria-hidden="true">
        <div v-for="tick in ticks" :key="tick" class="absolute inset-x-0 border-t border-lumia-ink/[0.06]" :style="{ bottom: `${(tick / maxValue) * 100}%` }">
          <span class="absolute -top-2.5 left-0 bg-white/90 pr-1 text-[10px] tabular-nums text-lumia-ink/45">{{ compact(tick) }}</span>
        </div>
      </div>

      <div
        class="relative ml-12 flex h-[220px] items-end gap-[2px] border-b border-lumia-ink/15"
        role="img"
        :aria-label="`Ventas por ${bucketNoun}: total ${formatCurrency(total)}. Usa “Ver tabla” para el detalle.`"
      >
        <div
          v-for="(bucket, index) in buckets"
          :key="bucket.key"
          class="relative flex h-full min-w-0 flex-1 items-end"
          @mouseenter="hovered = index"
        >
          <div
            class="w-full rounded-t-[4px] transition-opacity"
            :class="[bucket.revenue > 0 ? 'bg-chart-bar' : 'bg-transparent', hovered !== null && hovered !== index ? 'opacity-50' : '']"
            :style="{ height: bucket.revenue > 0 ? `max(2px, ${(bucket.revenue / maxValue) * 100}%)` : '0' }"
          />
        </div>

        <div
          v-if="hovered !== null && buckets[hovered]"
          class="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-lumia-ink/10 bg-white px-3 py-2 text-[12px] shadow-soft"
          :style="{ left: `${((hovered + 0.5) / buckets.length) * 100}%` }"
          role="status"
        >
          <p class="font-medium text-lumia-ink">{{ buckets[hovered]!.label }}</p>
          <p class="tabular-nums text-lumia-ink/75">{{ formatCurrency(buckets[hovered]!.revenue) }}</p>
          <p class="text-lumia-ink/55">{{ buckets[hovered]!.orders }} pedido(s) vendido(s)</p>
        </div>
      </div>
      <div class="ml-12 mt-1.5 flex justify-between text-[10px] text-lumia-ink/45" aria-hidden="true">
        <span>{{ buckets[0]?.label }}</span>
        <span>{{ buckets.at(-1)?.label }}</span>
      </div>
    </div>

    <div v-else class="max-h-[320px] overflow-auto rounded-xl border border-lumia-ink/[0.07]">
      <table class="w-full text-[13px]">
        <caption class="sr-only">Ventas por {{ bucketNoun }}</caption>
        <thead class="sticky top-0 bg-lumia-cream/90 text-left text-[12px] text-lumia-ink/60">
          <tr>
            <th scope="col" class="px-3 py-2 font-medium">{{ bucketNoun === 'día' ? 'Día (UTC)' : bucketNoun === 'semana' ? 'Semana (UTC)' : 'Mes (UTC)' }}</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Ventas</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Pedidos</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-lumia-ink/[0.05]">
          <tr v-for="bucket in buckets" :key="bucket.key">
            <td class="px-3 py-1.5 text-lumia-ink/80">{{ bucket.label }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums text-lumia-ink">{{ formatCurrency(bucket.revenue) }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums text-lumia-ink/70">{{ bucket.orders }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsPeriod } from '#shared/schemas/analytics'

/**
 * Ventas por día (7 y 30 días), por semana (90 días) o por mes (12 meses).
 * Los días vienen agrupados en UTC por el Server; las etiquetas lo indican en la tabla.
 */
const props = defineProps<{ days: { date: string; revenue: number; orders: number }[]; period: AnalyticsPeriod }>()

const showTable = ref(false)
const hovered = ref<number | null>(null)

const bucketNoun = computed(() => (props.period === '1y' ? 'mes' : props.period === '90d' ? 'semana' : 'día'))
const bucketLabel = computed(() =>
  props.period === '1y' ? 'Ventas por mes' : props.period === '90d' ? 'Ventas por semana' : 'Ventas por día',
)

const dayFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const label = (date: string) => dayFmt.format(new Date(`${date}T00:00:00Z`))

const buckets = computed(() => {
  const days = props.days
  if (bucketNoun.value === 'día') {
    return days.map((d) => ({ key: d.date, label: label(d.date), revenue: d.revenue, orders: d.orders }))
  }
  if (bucketNoun.value === 'mes') {
    const map = new Map<string, { key: string; label: string; revenue: number; orders: number }>()
    for (const d of days) {
      const key = d.date.slice(0, 7)
      const entry = map.get(key) ?? { key, label: monthFmt.format(new Date(`${key}-01T00:00:00Z`)), revenue: 0, orders: 0 }
      entry.revenue += d.revenue
      entry.orders += d.orders
      map.set(key, entry)
    }
    return [...map.values()]
  }
  const out: { key: string; label: string; revenue: number; orders: number }[] = []
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7)
    const first = chunk[0]
    const last = chunk.at(-1)
    if (!first || !last) continue
    out.push({
      key: first.date,
      label: `${label(first.date)} – ${label(last.date)}`,
      revenue: chunk.reduce((s, d) => s + d.revenue, 0),
      orders: chunk.reduce((s, d) => s + d.orders, 0),
    })
  }
  return out
})

const total = computed(() => buckets.value.reduce((s, b) => s + b.revenue, 0))

/** Máximo "redondo" para que las líneas de la rejilla caigan en valores legibles. */
const maxValue = computed(() => {
  const max = Math.max(0, ...buckets.value.map((b) => b.revenue))
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= max) ?? 10
  return step * magnitude
})
const ticks = computed(() => [0.5, 1].map((f) => maxValue.value * f))

const compactFmt = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 })
const compact = (v: number) => `$${compactFmt.format(v)}`
</script>
