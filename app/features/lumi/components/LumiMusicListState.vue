<template>
  <div v-if="load === 'loading'" class="space-y-1 px-2 pb-1" role="status" aria-label="Cargando">
    <div v-for="n in 3" :key="n" class="flex items-center gap-2.5 py-1">
      <span class="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-lumia-cream" />
      <span class="flex-1 space-y-1.5">
        <span class="block h-3 w-3/4 animate-pulse rounded bg-lumia-cream" />
        <span class="block h-2.5 w-1/3 animate-pulse rounded bg-lumia-cream" />
      </span>
    </div>
  </div>
  <div v-else-if="load === 'error'" class="flex items-center justify-between gap-2 px-2 pb-2 text-[12px] text-lumia-ink/65" role="alert">
    No se pudo consultar la música ahora mismo.
    <button type="button" class="rounded-md px-1.5 py-0.5 font-medium text-lumia-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/70" @click="$emit('retry')">
      Reintentar
    </button>
  </div>
  <p v-else-if="load === 'ready' && empty" class="px-2 pb-2 text-[12px] text-lumia-ink/60">{{ emptyText }}</p>
</template>

<script setup lang="ts">
/** Estados de carga, error y vacío de las listas del centro de música. */
defineProps<{ load: 'idle' | 'loading' | 'ready' | 'error'; empty: boolean; emptyText: string }>()
defineEmits<{ retry: [] }>()
</script>
