<template>
  <div class="relative">
    <select
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :class="['lumia-field-input appearance-none pr-10', invalid && 'lumia-field-input--invalid']"
    >
      <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
        {{ opt.label }}
      </option>
    </select>
    <IconChevronDown class="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lumia-ink/40" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { IconChevronDown } from '@tabler/icons-vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    id?: string
    options: { value: string; label: string; disabled?: boolean }[]
    placeholder?: string
    invalid?: boolean
    describedBy?: string
  }>(),
  { id: undefined, placeholder: undefined, invalid: false, describedBy: undefined },
)

const model = defineModel<string>({ default: '' })
</script>
