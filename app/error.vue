<template>
  <div class="flex min-h-screen items-center justify-center bg-lumia-canvas px-4">
    <div class="w-full max-w-md text-center">
      <p class="lumia-eyebrow mb-2">Error {{ error.statusCode }}</p>
      <h1 class="font-display text-4xl text-lumia-ink">{{ heading }}</h1>
      <p class="mt-3 text-sm text-lumia-ink/60">{{ message }}</p>
      <div class="mt-8 flex justify-center gap-2">
        <BaseButton variant="secondary" @click="goHome">Ir al dashboard</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const heading = computed(() => {
  if (props.error.statusCode === 403) return 'Acceso restringido'
  if (props.error.statusCode === 404) return 'Página no encontrada'
  return 'Algo salió mal'
})

const message = computed(() => {
  if (props.error.statusCode === 403) return 'Tu cuenta no tiene permiso para ver esta sección.'
  if (props.error.statusCode === 404) return 'La dirección no existe o el módulo aún no está disponible.'
  return 'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.'
})

useHead({ title: `${heading.value} · Lumia Admin` })

function goHome() {
  void clearError({ redirect: '/dashboard' })
}
</script>
