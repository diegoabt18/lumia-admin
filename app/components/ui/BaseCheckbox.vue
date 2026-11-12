<template>
  <label :for="id" class="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-lumia-ink/80">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      class="h-4 w-4 rounded border-lumia-ink/25 text-lumia-ink accent-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/60"
    >
    <span><slot /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ id: string }>()
const model = defineModel<boolean>({ default: false })
</script>
