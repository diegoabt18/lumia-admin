<template>
  <div class="space-y-5">
    <p class="text-[13px] text-lumia-ink/60">
      Define los atributos que diferencian a las variantes. Ej.: Tamaño con valores Pequeño, Mediano y Grande.
    </p>

    <ul v-if="axes.length > 0" class="space-y-3" aria-label="Ejes de opciones">
      <li v-for="(axis, idx) in axes" :key="`${axis.name}-${idx}`" class="rounded-xl border border-lumia-ink/10 bg-lumia-cream/40 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-lumia-ink">{{ axis.name }}</p>
            <p class="text-[12px] text-lumia-ink/55">{{ axis.values.length }} {{ axis.values.length === 1 ? 'valor' : 'valores' }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <BaseBadge v-for="(val, i) in axis.values" :key="i">{{ valueLabel(val) }}</BaseBadge>
            </div>
          </div>
          <BaseButton variant="ghost" size="sm" :aria-label="`Quitar el eje ${axis.name}`" @click="removeAxis(idx)">
            <template #icon>
              <IconX class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
            </template>
          </BaseButton>
        </div>
      </li>
    </ul>
    <p v-else class="text-[13px] text-lumia-ink/50">Este producto todavía no tiene ejes de opciones.</p>

    <div class="space-y-3 rounded-xl border border-dashed border-lumia-ink/15 p-4">
      <FormField :id="`${uid}-name`" label="Nombre del eje" :error="nameError" hint="Ej.: Tamaño, Color, Aroma.">
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="newName" :invalid="invalid" :described-by="describedBy" maxlength="60" />
        </template>
      </FormField>

      <FormField :id="`${uid}-values`" label="Valores (uno por línea)" hint="Máximo 30 valores.">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea :id="id" v-model="newValuesText" :rows="4" :invalid="invalid" :described-by="describedBy" />
        </template>
      </FormField>

      <BaseButton variant="secondary" size="sm" :disabled="!canAdd" @click="addAxis">
        <template #icon>
          <IconPlus class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        </template>
        Agregar eje
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconPlus, IconX } from '@tabler/icons-vue'
import type { OptionAxis } from '#shared/schemas/variants'

/**
 * Editor de ejes de opciones del producto. No muta la prop: cada cambio emite una lista nueva,
 * y el padre (página de producto) decide si la envía al guardar.
 */
const props = defineProps<{ modelValue: OptionAxis[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: OptionAxis[]] }>()

const uid = useId()
const MAX_VALUES = 30

const axes = computed(() => props.modelValue ?? [])
const newName = ref('')
const newValuesText = ref('')

const parsedValues = computed(() => [
  ...new Set(
    newValuesText.value
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean),
  ),
])

const nameError = computed(() => {
  const name = newName.value.trim().toLocaleLowerCase('es-CO')
  if (!name) return undefined
  return axes.value.some((a) => a.name.trim().toLocaleLowerCase('es-CO') === name) ? 'Ya existe un eje con ese nombre.' : undefined
})

const canAdd = computed(
  () => Boolean(newName.value.trim()) && !nameError.value && parsedValues.value.length > 0 && parsedValues.value.length <= MAX_VALUES,
)

function valueLabel(value: OptionAxis['values'][number]): string {
  return typeof value === 'string' ? value : value.value
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function addAxis() {
  if (!canAdd.value) return
  emit('update:modelValue', [
    ...axes.value,
    {
      name: newName.value.trim(),
      position: axes.value.length,
      values: parsedValues.value.map((v) => ({ value: v, slug: slugify(v) })),
    },
  ])
  newName.value = ''
  newValuesText.value = ''
}

function removeAxis(idx: number) {
  emit(
    'update:modelValue',
    axes.value.filter((_, i) => i !== idx).map((axis, position) => ({ ...axis, position })),
  )
}
</script>
