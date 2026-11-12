<template>
  <span
    role="status"
    :aria-label="label"
    class="inline-block animate-spin rounded-full border-2 border-solid border-r-transparent"
    :class="[sizeClass, toneClass]"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ size?: 'sm' | 'md' | 'lg'; tone?: 'dark' | 'light' | 'gold'; label?: string }>(),
  { size: 'md', tone: 'dark', label: 'Cargando' },
)

const sizeClass = computed(() => ({ sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' })[props.size])
const toneClass = computed(
  () => ({ dark: 'border-lumia-ink/60', light: 'border-lumia-cream/90', gold: 'border-lumia-gold' })[props.tone],
)
</script>
