<template>
  <BaseCard :title="title" :description="description">
    <template #actions>
      <BaseBadge v-if="!loading" :tone="items.length ? tone : 'positive'">{{ items.length }}</BaseBadge>
    </template>
    <div v-if="loading" class="space-y-3">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-4 w-full" />
    </div>
    <EmptyState v-else-if="!items.length" :title="emptyTitle" compact>
      <template #icon>
        <IconCircleCheck class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
      </template>
    </EmptyState>
    <ul v-else class="divide-y divide-lumia-ink/[0.05]">
      <li v-for="item in items" :key="item.key" class="flex items-center justify-between gap-3 py-2.5 text-sm">
        <span class="truncate text-lumia-ink/85">{{ item.label }}</span>
        <span v-if="item.detail" class="shrink-0 text-[12px] text-lumia-ink/50">{{ formatDetail(item.detail) }}</span>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import { IconCircleCheck } from '@tabler/icons-vue'
import type { DashboardListItem } from '#shared/schemas/dashboard'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    items: DashboardListItem[]
    emptyTitle: string
    tone?: 'warning' | 'danger' | 'info'
    loading?: boolean
    detailIsDate?: boolean
  }>(),
  { description: undefined, tone: 'warning', loading: false, detailIsDate: false },
)

function formatDetail(detail: string) {
  return props.detailIsDate ? `Vence ${formatDateTime(detail)}` : detail
}
</script>
