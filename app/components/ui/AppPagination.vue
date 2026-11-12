<template>
  <div v-if="pagination.total > 0" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-[13px] text-lumia-ink/55">
      Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ pagination.total }} {{ itemLabel }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <label class="sr-only" :for="limitId">Registros por página</label>
      <select
        :id="limitId"
        class="rounded-lg border border-lumia-ink/15 bg-white/70 px-2 py-1.5 text-sm text-lumia-ink focus:border-lumia-gold/50 focus:outline-none focus:ring-1 focus:ring-lumia-gold/30"
        :value="pagination.limit"
        :disabled="disabled"
        @change="onLimitChange"
      >
        <option v-for="opt in limitOptions" :key="opt" :value="opt">{{ opt }} / pág.</option>
      </select>

      <nav v-if="pagination.totalPages > 1" class="flex flex-wrap items-center gap-1" aria-label="Paginación">
        <button
          type="button"
          :class="pageButton(false)"
          :disabled="!pagination.hasPrev || disabled"
          @click="emit('update:page', pagination.page - 1)"
        >
          <span class="sr-only">Anterior</span>
          <IconChevronLeft class="h-4 w-4" aria-hidden="true" />
        </button>
        <template v-for="(n, idx) in visiblePages" :key="`p-${idx}-${n}`">
          <span v-if="n === '…'" class="px-1 text-sm text-lumia-ink/35" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            :class="pageButton(n === pagination.page)"
            :aria-current="n === pagination.page ? 'page' : undefined"
            :disabled="disabled"
            @click="emit('update:page', n)"
          >
            {{ n }}
          </button>
        </template>
        <button
          type="button"
          :class="pageButton(false)"
          :disabled="!pagination.hasNext || disabled"
          @click="emit('update:page', pagination.page + 1)"
        >
          <span class="sr-only">Siguiente</span>
          <IconChevronRight class="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-vue'
import type { AdminPaginationMeta } from '#shared/contracts/api'

/**
 * Paginación basada en el contrato oficial AdminPaginationMeta (server/shared/contracts/api.ts).
 * Algoritmo de páginas visibles tomado de lumia2.0/app/components/ui/AppPagination.vue.
 */
const props = withDefaults(
  defineProps<{
    pagination: AdminPaginationMeta
    disabled?: boolean
    limitOptions?: number[]
    itemLabel?: string
  }>(),
  { disabled: false, limitOptions: () => [10, 25, 50], itemLabel: 'registros' },
)

const emit = defineEmits<{ 'update:page': [page: number]; 'update:limit': [limit: number] }>()
const limitId = useId()

const rangeStart = computed(() => (props.pagination.page - 1) * props.pagination.limit + 1)
const rangeEnd = computed(() => Math.min(props.pagination.page * props.pagination.limit, props.pagination.total))

function onLimitChange(e: Event) {
  const v = Number.parseInt((e.target as HTMLSelectElement).value, 10)
  if (Number.isFinite(v)) emit('update:limit', v)
}

function pageButton(active: boolean) {
  return [
    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-lumia-gold/40 bg-lumia-cream/70 text-lumia-ink'
      : 'border-lumia-ink/12 text-lumia-ink/75 hover:border-lumia-gold/35 hover:bg-lumia-cream/50',
  ].join(' ')
}

const visiblePages = computed<(number | '…')[]>(() => {
  const total = Math.max(1, props.pagination.totalPages)
  const p = props.pagination.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, p - 1, p, p + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push('…')
    out.push(n)
  })
  return out
})
</script>
