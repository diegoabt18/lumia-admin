<template>
  <BaseBadge :tone="tone">{{ ORDER_STATUS_LABELS[status] }}</BaseBadge>
</template>

<script setup lang="ts">
import { ORDER_STATUS_LABELS, type OrderStatus } from '#shared/schemas/orders'

const props = defineProps<{ status: OrderStatus }>()

const tone = computed(() => {
  switch (props.status) {
    case 'pending':
      return 'warning' as const
    case 'paid':
      return 'info' as const
    case 'shipped':
      return 'gold' as const
    case 'delivered':
      return 'positive' as const
    case 'cancelled':
      return 'danger' as const
    default:
      return 'neutral' as const
  }
})
</script>
