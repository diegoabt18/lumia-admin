<template>
  <BaseBadge v-if="environment" :tone="tone" :title="title">
    <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {{ label }}
  </BaseBadge>
</template>

<script setup lang="ts">
import type { ServerEnvironment } from '#shared/types/environment'

/** Entorno de datos del Server conectado (GET /api/admin/meta vía BFF). */
const props = defineProps<{ environment: ServerEnvironment | null }>()

const tone = computed(() => {
  const tier = props.environment?.databaseTier
  if (tier === 'production') return 'danger'
  if (tier === 'staging') return 'warning'
  return 'positive'
})

const label = computed(() => {
  const tier = props.environment?.databaseTier
  if (tier === 'production') return 'Producción'
  if (tier === 'staging') return 'Staging'
  return 'Desarrollo'
})

const title = computed(() =>
  props.environment
    ? `Server: ${props.environment.nodeEnv} · Base de datos: ${props.environment.databaseProvider === 'atlas' ? 'Atlas' : 'local'}`
    : undefined,
)
</script>
