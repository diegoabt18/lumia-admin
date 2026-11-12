<template>
  <div
    role="alert"
    class="flex flex-col items-center justify-center rounded-xl border border-status-danger/15 bg-status-danger-soft/35 px-6 py-8 text-center"
  >
    <span class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-status-danger">
      <IconAlertTriangle class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
    </span>
    <p class="text-sm font-medium text-lumia-ink">{{ title }}</p>
    <p v-if="message" class="mt-1 max-w-md text-[13px] text-lumia-ink/60">{{ message }}</p>
    <p v-if="requestId" class="mt-2 font-mono text-[11px] text-lumia-ink/40">Ref. {{ requestId }}</p>
    <BaseButton v-if="retryable" class="mt-4" variant="secondary" size="sm" :loading="retrying" @click="emit('retry')">
      <template #icon>
        <IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
      </template>
      Reintentar
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-vue'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    requestId?: string
    retryable?: boolean
    retrying?: boolean
  }>(),
  {
    title: 'No se pudo cargar la información',
    message: undefined,
    requestId: undefined,
    retryable: true,
    retrying: false,
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>
