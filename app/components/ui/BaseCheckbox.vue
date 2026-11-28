<template>
  <label :for="id" class="inline-flex select-none items-center gap-2.5 text-sm text-lumia-ink/80" :class="disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      :disabled="disabled"
      class="h-4 w-4 rounded border-lumia-ink/25 text-lumia-ink accent-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/60"
    >
    <span><slot /></span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ id: string; disabled?: boolean }>(), { disabled: false })
const model = defineModel<boolean>({ default: false })
</script>
