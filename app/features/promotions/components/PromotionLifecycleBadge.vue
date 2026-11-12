<template>
  <BaseBadge :tone="tone">{{ LIFECYCLE_LABELS[lifecycle] }}</BaseBadge>
</template>

<script setup lang="ts">
import { LIFECYCLE_LABELS, type PromotionLifecycle } from '#shared/schemas/promotions'

const props = defineProps<{ lifecycle: PromotionLifecycle }>()
const tone = computed(() => ({ activa: 'positive', pendiente: 'info', finalizada: 'neutral' } as const)[props.lifecycle])
</script>
