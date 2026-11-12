<template>
  <BaseBadge :tone="status === 'active' ? 'positive' : 'neutral'">
    {{ status === 'active' ? 'Activo' : 'Inactivo' }}
  </BaseBadge>
</template>

<script setup lang="ts">
import type { ProductStatus } from '#shared/schemas/products'

defineProps<{ status: ProductStatus }>()
</script>
