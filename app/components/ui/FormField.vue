<template>
  <div class="space-y-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="id" class="text-[13px] font-medium text-lumia-ink">
        {{ label }}
        <span v-if="required" class="text-status-danger" aria-hidden="true">*</span>
        <span v-if="required" class="sr-only">(obligatorio)</span>
      </label>
      <slot name="aside" />
    </div>

    <slot :id="id" :invalid="Boolean(error)" :described-by="describedBy" />

    <p v-if="error" :id="`${id}-error`" class="flex items-start gap-1.5 text-[13px] text-status-danger" role="alert">
      <IconAlertCircle class="mt-px h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-[13px] text-lumia-ink/50">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { IconAlertCircle } from '@tabler/icons-vue'

/**
 * Envoltorio de campo: etiqueta, marca de obligatorio, ayuda y error específico.
 * Expone `id`, `invalid` y `describedBy` al control vía slot para conectar aria-*.
 */
const props = withDefaults(
  defineProps<{ label: string; id: string; error?: string; hint?: string; required?: boolean }>(),
  { error: undefined, hint: undefined, required: false },
)

const describedBy = computed(() => {
  if (props.error) return `${props.id}-error`
  if (props.hint) return `${props.id}-hint`
  return undefined
})
</script>
