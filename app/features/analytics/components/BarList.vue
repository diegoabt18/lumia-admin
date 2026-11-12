<template>
  <div>
    <p v-if="!items.length" class="text-[13px] text-lumia-ink/55">{{ emptyText }}</p>
    <ul v-else class="space-y-3">
      <li v-for="item in items" :key="item.key">
        <div class="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
          <span class="min-w-0 truncate text-lumia-ink">{{ item.label }}</span>
          <span class="shrink-0 tabular-nums text-lumia-ink/75">{{ item.display ?? formatNumber(item.value) }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-lumia-cream" aria-hidden="true">
          <div class="h-full rounded-full bg-chart-bar" :style="{ width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/** Lista de magnitudes con barra horizontal (una sola serie: el texto lleva el valor exacto). */
const props = withDefaults(
  defineProps<{ items: { key: string; label: string; value: number; display?: string }[]; emptyText?: string }>(),
  { emptyText: 'Sin datos en este periodo.' },
)
const max = computed(() => Math.max(0, ...props.items.map((i) => i.value)))
</script>
