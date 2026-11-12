<template>
  <div class="relative">
    <span
      v-if="$slots.leading"
      class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-lumia-ink/40"
    >
      <slot name="leading" />
    </span>
    <input
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :type="type"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :class="['lumia-field-input', invalid && 'lumia-field-input--invalid', $slots.leading && 'pl-10']"
    >
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{ id?: string; type?: string; invalid?: boolean; describedBy?: string }>(),
  { id: undefined, type: 'text', invalid: false, describedBy: undefined },
)

const model = defineModel<string>({ default: '' })
</script>
