<template>
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <label :for="id" class="text-sm font-medium text-lumia-ink">{{ label }}</label>
      <p v-if="description" :id="`${id}-desc`" class="mt-0.5 text-[12px] text-lumia-ink/50">{{ description }}</p>
    </div>
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-describedby="description ? `${id}-desc` : undefined"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/60 disabled:cursor-not-allowed disabled:opacity-45"
      :class="model ? 'bg-lumia-ink' : 'bg-lumia-ink/15'"
      @click="model = !model"
    >
      <span class="inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200" :class="model ? 'translate-x-[22px]' : 'translate-x-0.5'" />
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ id: string; label: string; description?: string; disabled?: boolean }>(), {
  description: undefined,
  disabled: false,
})
const model = defineModel<boolean>({ default: false })
</script>
