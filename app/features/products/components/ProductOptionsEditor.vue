<template>
  <fieldset class="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
    <legend class="text-sm font-semibold text-gray-900">Ejes de Opciones (Tamaño, Color, etc.)</legend>
    <p class="text-sm text-gray-600">Define los atributos que diferencia a las variantes. Ej: Tamaño con valores Pequeño, Mediano, Grande.</p>

    <!-- Lista de ejes existentes -->
    <div v-if="axes.length > 0" class="space-y-3">
      <div v-for="(axis, idx) in axes" :key="idx" class="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <p class="font-medium text-gray-900">{{ axis.name }}</p>
            <p class="text-sm text-gray-600">{{ axis.values.length }} valores</p>
            <div class="mt-2 flex flex-wrap gap-1">
              <span v-for="(val, i) in axis.values" :key="i" class="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                {{ typeof val === 'string' ? val : val.value }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="text-red-600 hover:text-red-800"
            @click="removeAxis(idx)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Formulario para agregar nuevo eje -->
    <div class="space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <div>
        <label class="text-sm font-medium text-gray-700">Nombre del eje</label>
        <input
          v-model="newAxis.name"
          type="text"
          placeholder="Ej. Tamaño, Color, Aroma"
          class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label class="text-sm font-medium text-gray-700">Valores (uno por línea)</label>
        <textarea
          v-model="newAxis.valuesText"
          placeholder="Pequeño&#10;Mediano&#10;Grande"
          rows="4"
          class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="button"
        :disabled="!newAxis.name || !newAxis.valuesText"
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        @click="addAxis"
      >
        + Agregar eje
      </button>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import type { OptionAxis } from '#shared/schemas/variants'

const props = defineProps<{
  modelValue: OptionAxis[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OptionAxis[]]
}>()

const axes = ref<OptionAxis[]>(props.modelValue || [])

const newAxis = ref({
  name: '',
  valuesText: '',
})

function addAxis() {
  if (!newAxis.value.name || !newAxis.value.valuesText) return

  const values = newAxis.value.valuesText
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)

  if (values.length === 0) return

  axes.value.push({
    name: newAxis.value.name,
    position: axes.value.length,
    values: values.map((v) => ({ value: v, slug: v.toLowerCase().replace(/\s+/g, '-') })),
  })

  emit('update:modelValue', axes.value)

  newAxis.value.name = ''
  newAxis.value.valuesText = ''
}

function removeAxis(idx: number) {
  axes.value.splice(idx, 1)
  emit('update:modelValue', axes.value)
}
</script>
