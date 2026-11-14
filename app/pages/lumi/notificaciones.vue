<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Notificaciones"
      description="Historial de avisos del motor de automatización e iniciativas. La campana de la barra superior muestra las más recientes."
    />

    <div v-if="loading && !items.length" class="space-y-3">
      <BaseSkeleton v-for="n in 4" :key="n" class="h-20 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState title="No tienes notificaciones" description="Aquí aparecerán los avisos de tus rutinas e iniciativas." />
    </BaseCard>

    <BaseCard v-else>
      <ul class="divide-y divide-lumia-ink/[0.05]">
        <li v-for="item in items" :key="item.id" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between" :class="item.read ? '' : 'bg-lumia-cream/40'">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="!item.read" class="h-2 w-2 rounded-full bg-lumia-ink" aria-label="Sin leer" />
              <p class="font-medium text-lumia-ink">{{ item.title }}</p>
            </div>
            <p class="text-[13px] leading-relaxed text-lumia-ink/70">{{ item.message }}</p>
            <p class="text-[12px] text-lumia-ink/45">
              {{ formatDateTime(item.createdAt) }}
              <span v-if="item.reviewed"> · Revisada</span>
            </p>
          </div>

          <div class="flex shrink-0 flex-wrap gap-2">
            <BaseButton
              v-if="automationTaskIdOf(item) && !item.reviewed"
              size="sm"
              :loading="busyId === item.id"
              :disabled="Boolean(busyId)"
              @click="onReview(item)"
            >
              Marcar como revisado
            </BaseButton>
            <BaseButton
              v-if="!item.read"
              variant="secondary"
              size="sm"
              :disabled="Boolean(busyId)"
              @click="onMarkRead(item)"
            >
              Marcar como leída
            </BaseButton>
          </div>
        </li>
      </ul>

      <div v-if="hasMore" class="flex justify-center border-t border-lumia-ink/[0.05] px-5 py-4">
        <BaseButton variant="secondary" :loading="loadingMore" :disabled="loadingMore" @click="loadMore">Cargar más</BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  automationTaskIdOf,
  markNotificationsReadResponseSchema,
  notificationListResponseSchema,
  reviewNotificationResponseSchema,
  type NotificationItem,
} from '#shared/schemas/notifications'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Notificaciones',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Notificaciones' }],
})

const PAGE_SIZE = 20
const { request } = useAdminApi()
const toast = useToast()

async function fetchPage(page: number) {
  return notificationListResponseSchema.parse(
    await request<unknown>('/api/notifications', { query: { page, limit: PAGE_SIZE } }),
  )
}

const { data, status, error, refresh } = useAsyncData('admin-lumi-notifications', () => fetchPage(1))
const items = ref<NotificationItem[]>([])
const page = ref(1)
const hasMore = ref(false)

watch(
  data,
  (value) => {
    if (!value) return
    items.value = value.items
    page.value = 1
    hasMore.value = value.items.length === PAGE_SIZE
  },
  { immediate: true },
)

const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const loadingMore = ref(false)
async function loadMore() {
  loadingMore.value = true
  try {
    const next = await fetchPage(page.value + 1)
    const known = new Set(items.value.map((i) => i.id))
    items.value = [...items.value, ...next.items.filter((i) => !known.has(i.id))]
    page.value += 1
    hasMore.value = next.items.length === PAGE_SIZE
  } catch (e) {
    toast.error('No se pudieron cargar más notificaciones', toUiError(e).message)
  } finally {
    loadingMore.value = false
  }
}

const busyId = ref<string | null>(null)

async function onMarkRead(item: NotificationItem) {
  busyId.value = item.id
  try {
    markNotificationsReadResponseSchema.parse(
      await request<unknown>('/api/notifications/read', { method: 'PATCH', body: { ids: [item.id] } }),
    )
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, read: true } : i))
  } catch (e) {
    toast.error('No se pudo marcar como leída', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

async function onReview(item: NotificationItem) {
  busyId.value = item.id
  try {
    reviewNotificationResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/automation/notifications/${item.id}/review`, { method: 'POST' }),
    )
    toast.success('Revisión confirmada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo confirmar la revisión', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}
</script>
