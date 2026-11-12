<template>
  <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Rango de fechas">
    <label :for="`${id}-from`" class="sr-only">Desde</label>
    <BaseInput :id="`${id}-from`" :model-value="from" type="date" class="w-[9.5rem]" :max="to || undefined" @update:model-value="(v) => emit('update', { from: v, to })" />
    <span class="text-[12px] text-lumia-ink/45" aria-hidden="true">a</span>
    <label :for="`${id}-to`" class="sr-only">Hasta</label>
    <BaseInput :id="`${id}-to`" :model-value="to" type="date" class="w-[9.5rem]" :min="from || undefined" @update:model-value="(v) => emit('update', { from, to: v })" />
    <BaseButton v-if="from || to" variant="ghost" size="sm" @click="emit('update', { from: '', to: '' })">Limpiar</BaseButton>
  </div>
</template>

<script setup lang="ts">
/** Rango de días en la hora de la tienda (el BFF los convierte a UTC). */
defineProps<{ from: string; to: string }>()
const emit = defineEmits<{ update: [range: { from: string; to: string }] }>()
const id = useId()
</script>
