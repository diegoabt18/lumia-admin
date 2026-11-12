<template>
  <div class="rounded-2xl border border-lumia-ink/[0.07] bg-white/80 p-5 shadow-soft">
    <div class="flex items-start justify-between gap-3">
      <p class="text-[12px] font-medium uppercase tracking-[0.12em] text-lumia-ink/50">{{ label }}</p>
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-lumia-cream text-lumia-gold">
        <component :is="icon" class="h-[18px] w-[18px]" stroke-width="1.5" aria-hidden="true" />
      </span>
    </div>
    <BaseSkeleton v-if="loading" class="mt-3 h-8 w-24" />
    <p v-else class="mt-2 font-display text-[2rem] leading-none tabular-nums text-lumia-ink">{{ value }}</p>
    <p v-if="caption" class="mt-2 text-[12px] text-lumia-ink/50">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; value: string; icon: unknown; caption?: string; loading?: boolean }>(),
  { caption: undefined, loading: false },
)
</script>
