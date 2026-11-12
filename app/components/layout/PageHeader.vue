<template>
  <div class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <p v-if="eyebrow" class="lumia-eyebrow mb-1">{{ eyebrow }}</p>
      <h1 class="font-display text-3xl leading-tight text-lumia-ink sm:text-[2.1rem]">{{ title }}</h1>
      <p v-if="description" class="mt-1.5 max-w-2xl text-sm text-lumia-ink/60">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; eyebrow?: string }>(), {
  description: undefined,
  eyebrow: undefined,
})
</script>
