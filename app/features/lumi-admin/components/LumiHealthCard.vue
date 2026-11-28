<template>
  <BaseCard
    title="Estado de Lumi"
    description="Se comprueba cada minuto. Si algo cae o vuelve, recibes un aviso aquí y en LumiChat."
  >
    <div v-if="status === 'pending' && !components.length" class="grid gap-3 sm:grid-cols-3">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-16 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !components.length" :message="errorMessage" @retry="refresh" />
    <ul v-else class="grid gap-3 sm:grid-cols-3">
      <li
        v-for="item in components"
        :key="item.component"
        class="rounded-xl border border-lumia-ink/[0.06] px-4 py-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="font-medium text-lumia-ink">{{ NAMES[item.component] }}</p>
          <BaseBadge :tone="TONES[item.status]">{{ LABELS[item.status] }}</BaseBadge>
        </div>
        <p class="mt-1 text-[12px] text-lumia-ink/55">
          <template v-if="item.status === 'down' && item.since">Caído desde {{ formatDateTime(item.since) }}</template>
          <template v-else-if="item.lastCheckedAt">Comprobado {{ formatDateTime(item.lastCheckedAt) }}</template>
          <template v-else>Sin comprobar todavía</template>
        </p>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import { lumiHealthSchema, type LumiHealthComponent } from '#shared/schemas/lumi'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

const NAMES: Record<LumiHealthComponent['component'], string> = {
  redis: 'Redis',
  assistant: 'IA Assistant',
  ollama: 'Ollama',
}
const LABELS: Record<LumiHealthComponent['status'], string> = {
  ok: 'Responde',
  down: 'No responde',
  unknown: 'Sin dato',
}
const TONES: Record<LumiHealthComponent['status'], 'positive' | 'danger' | 'neutral'> = {
  ok: 'positive',
  down: 'danger',
  unknown: 'neutral',
}

const { request } = useAdminApi()
const { data, status, error, refresh } = useAsyncData('admin-lumi-health', async () =>
  lumiHealthSchema.parse(await request<unknown>('/api/admin/lumi/health')),
)
const components = computed(() => data.value?.components ?? [])
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))
</script>
