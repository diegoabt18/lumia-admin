<template>
  <fieldset class="grid gap-4 sm:grid-cols-2" :disabled="disabled">
    <legend class="sr-only">Ajustes de conversión</legend>

    <FormField :id="`${id}-quality`" :label="`Calidad: ${model.quality}`" hint="40 = más ligera · 80 = más nítida">
      <input
        :id="`${id}-quality`"
        v-model.number="model.quality"
        type="range"
        min="40"
        max="80"
        step="1"
        class="w-full accent-lumia-ink"
      >
    </FormField>

    <FormField :id="`${id}-fit`" label="Encuadre">
      <template #default="{ id: fieldId }">
        <BaseSelect :id="fieldId" v-model="model.fit" :options="fitOptions" />
      </template>
    </FormField>

    <FormField :id="`${id}-bg`" label="Fondo">
      <template #default="{ id: fieldId }">
        <BaseSelect :id="fieldId" v-model="model.background" :options="backgroundOptions" />
      </template>
    </FormField>

    <FormField v-if="model.background === 'custom'" :id="`${id}-hex`" label="Color de fondo" :error="hexError">
      <div class="flex items-center gap-2">
        <input :id="`${id}-hex`" v-model="model.customHex" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-lumia-ink/15 bg-white">
        <code class="text-[12px] text-lumia-ink/60">{{ model.customHex }}</code>
      </div>
    </FormField>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <BaseCheckbox :id="`${id}-alpha`" v-model="model.preserveAlpha">Conservar transparencia (PNG con fondo transparente)</BaseCheckbox>
      <BaseCheckbox :id="`${id}-enlarge`" v-model="model.withoutEnlargement">No ampliar por encima del tamaño original</BaseCheckbox>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { ImageStudioConfig } from '#shared/schemas/images'

withDefaults(defineProps<{ disabled?: boolean; hexError?: string }>(), { disabled: false, hexError: undefined })
const model = defineModel<ImageStudioConfig>({ required: true })
const id = useId()

const fitOptions = [
  { value: 'contain', label: 'Completa (sin recortar)' },
  { value: 'cover', label: 'Rellenar (recorta bordes)' },
]
const backgroundOptions = [
  { value: 'white', label: 'Blanco' },
  { value: 'transparent', label: 'Transparente' },
  { value: 'custom', label: 'Color personalizado' },
]
</script>
