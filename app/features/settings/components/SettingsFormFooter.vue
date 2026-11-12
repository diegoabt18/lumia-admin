<template>
  <div class="mt-6 flex flex-col gap-3 border-t border-lumia-ink/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
    <p v-if="formError" role="alert" class="text-[13px] text-status-danger">{{ formError }}</p>
    <p v-else-if="dirty" class="text-[12px] text-lumia-ink/50">Cambios sin guardar</p>
    <span v-else />
    <div class="flex flex-wrap justify-end gap-2">
      <slot name="extra" />
      <BaseButton variant="secondary" :disabled="!dirty || saving" @click="emit('discard')">Descartar</BaseButton>
      <BaseButton type="submit" :loading="saving" :disabled="!dirty">Guardar</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ dirty: boolean; saving: boolean; formError: string | null }>()
const emit = defineEmits<{ discard: [] }>()
</script>
