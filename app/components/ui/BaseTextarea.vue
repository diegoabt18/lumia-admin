<template>
  <textarea
    v-bind="$attrs"
    :id="id"
    v-model="model"
    :rows="rows"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    :class="['lumia-field-input min-h-[96px] resize-y leading-relaxed', invalid && 'lumia-field-input--invalid']"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{ id?: string; rows?: number; invalid?: boolean; describedBy?: string }>(),
  { id: undefined, rows: 4, invalid: false, describedBy: undefined },
)

const model = defineModel<string>({ default: '' })
</script>
