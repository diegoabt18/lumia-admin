<template>
  <div class="flex flex-col items-center justify-center px-6 py-10 text-center" :class="compact ? 'py-6' : 'py-12'">
    <span class="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-lumia-cream text-lumia-gold">
      <slot name="icon">
        <IconInbox class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
      </slot>
    </span>
    <p class="text-sm font-medium text-lumia-ink">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-[13px] text-lumia-ink/55">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconInbox } from '@tabler/icons-vue'

withDefaults(defineProps<{ title: string; description?: string; compact?: boolean }>(), {
  description: undefined,
  compact: false,
})
</script>
