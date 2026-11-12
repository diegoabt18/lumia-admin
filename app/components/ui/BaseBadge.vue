<template>
  <span
    class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
    :class="toneClass"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ tone?: 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info' }>(),
  { tone: 'neutral' },
)

const toneClass = computed(
  () =>
    ({
      neutral: 'bg-lumia-beige/60 text-lumia-ink/70',
      gold: 'bg-lumia-gold/15 text-[#8a6a22]',
      positive: 'bg-status-positive-soft text-status-positive',
      warning: 'bg-status-warning-soft text-status-warning',
      danger: 'bg-status-danger-soft text-status-danger',
      info: 'bg-status-info-soft text-status-info',
    })[props.tone],
)
</script>
