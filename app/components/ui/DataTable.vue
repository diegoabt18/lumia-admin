<template>
  <div class="relative" :aria-busy="loading || undefined">
    <ErrorState
      v-if="error"
      :message="error"
      :retrying="loading"
      @retry="emit('retry')"
    />

    <template v-else>
      <!-- Escritorio: tabla -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full border-separate border-spacing-0 text-sm">
          <caption v-if="caption" class="sr-only">{{ caption }}</caption>
          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                :aria-sort="ariaSort(column)"
                class="border-b border-lumia-ink/[0.08] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumia-ink/50"
                :class="[alignClass(column), column.class]"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-1 uppercase tracking-[0.12em] transition-colors hover:text-lumia-ink"
                  :class="sort?.key === column.key && 'text-lumia-ink'"
                  @click="toggleSort(column.key)"
                >
                  {{ column.label }}
                  <IconArrowUp v-if="sort?.key === column.key && sort.direction === 'asc'" class="h-3.5 w-3.5" aria-hidden="true" />
                  <IconArrowDown v-else-if="sort?.key === column.key" class="h-3.5 w-3.5" aria-hidden="true" />
                  <IconArrowsSort v-else class="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
              <th v-if="$slots.actions" scope="col" class="border-b border-lumia-ink/[0.08] px-4 py-3 text-right">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading && !rows.length">
              <tr v-for="n in skeletonRows" :key="`sk-${n}`">
                <td v-for="column in columns" :key="column.key" class="border-b border-lumia-ink/[0.05] px-4 py-3.5">
                  <BaseSkeleton class="h-4 w-3/4" />
                </td>
                <td v-if="$slots.actions" class="border-b border-lumia-ink/[0.05] px-4 py-3.5" />
              </tr>
            </template>
            <tr
              v-for="(row, index) in rows"
              v-else
              :key="rowKey(row, index)"
              class="transition-colors hover:bg-lumia-cream/40"
              :class="loading && 'opacity-60'"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="border-b border-lumia-ink/[0.05] px-4 py-3 text-lumia-ink/85"
                :class="[alignClass(column), column.class]"
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column.key)">
                  {{ formatCell(cellValue(row, column.key)) }}
                </slot>
              </td>
              <td v-if="$slots.actions" class="border-b border-lumia-ink/[0.05] px-4 py-2 text-right">
                <div class="flex justify-end gap-1">
                  <slot name="actions" :row="row" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Móvil: tarjetas -->
      <ul class="space-y-2 md:hidden">
        <template v-if="loading && !rows.length">
          <li v-for="n in skeletonRows" :key="`skm-${n}`" class="space-y-2 rounded-xl border border-lumia-ink/[0.06] p-4">
            <BaseSkeleton class="h-4 w-2/3" />
            <BaseSkeleton class="h-3 w-1/2" />
          </li>
        </template>
        <li
          v-for="(row, index) in rows"
          v-else
          :key="rowKey(row, index)"
          class="rounded-xl border border-lumia-ink/[0.06] bg-white/60 p-4"
        >
          <dl class="space-y-1.5">
            <div
              v-for="column in mobileColumns"
              :key="column.key"
              class="flex items-start justify-between gap-4 text-sm"
            >
              <dt class="text-[12px] text-lumia-ink/50">{{ column.label }}</dt>
              <dd class="text-right text-lumia-ink/85">
                <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column.key)">
                  {{ formatCell(cellValue(row, column.key)) }}
                </slot>
              </dd>
            </div>
          </dl>
          <div v-if="$slots.actions" class="mt-3 flex justify-end gap-1 border-t border-lumia-ink/[0.05] pt-3">
            <slot name="actions" :row="row" />
          </div>
        </li>
      </ul>

      <EmptyState
        v-if="!loading && !rows.length"
        :title="emptyTitle"
        :description="emptyDescription"
        compact
      >
        <slot name="empty-actions" />
      </EmptyState>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { IconArrowDown, IconArrowsSort, IconArrowUp } from '@tabler/icons-vue'
import type { SortState, TableColumn } from '~/types/ui'

/**
 * Tabla administrativa reutilizable.
 * - Solo presenta: los datos, el orden y la paginación los decide quien la usa
 *   (normalmente el Server, con paginación del lado del servidor).
 * - Estados: carga (skeleton), vacío, error con reintento.
 * - Responsive: tabla en escritorio, tarjetas en móvil.
 */
const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: T[]
    rowKey?: (row: T, index: number) => string | number
    loading?: boolean
    error?: string | null
    caption?: string
    emptyTitle?: string
    emptyDescription?: string
    skeletonRows?: number
  }>(),
  {
    rowKey: (_row: T, index: number) => index,
    loading: false,
    error: null,
    caption: undefined,
    emptyTitle: 'Sin resultados',
    emptyDescription: undefined,
    skeletonRows: 5,
  },
)

const sort = defineModel<SortState | null>('sort', { default: null })
const emit = defineEmits<{ retry: [] }>()

const mobileColumns = computed(() => props.columns.filter((c) => !c.hideOnMobile))

function cellValue(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function alignClass(column: TableColumn) {
  return { left: 'text-left', right: 'text-right', center: 'text-center' }[column.align ?? 'left']
}

function ariaSort(column: TableColumn) {
  if (!column.sortable) return undefined
  if (sort.value?.key !== column.key) return 'none'
  return sort.value.direction === 'asc' ? 'ascending' : 'descending'
}

function toggleSort(key: string) {
  if (sort.value?.key !== key) sort.value = { key, direction: 'asc' }
  else sort.value = { key, direction: sort.value.direction === 'asc' ? 'desc' : 'asc' }
}
</script>
