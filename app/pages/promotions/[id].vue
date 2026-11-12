<template>
  <div>
    <div v-if="loading && !promotion" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-80 w-full" />
    </div>
    <ErrorState
      v-else-if="loadError && !promotion"
      :title="loadError.status === 404 ? 'Promoción no encontrada' : 'No se pudo cargar la promoción'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />
    <template v-else-if="promotion">
      <PageHeader eyebrow="Promoción" :title="promotion.name" :description="promotion.updatedAt ? `Actualizada ${formatDateTime(promotion.updatedAt)}` : undefined">
        <template #actions>
          <PromotionLifecycleBadge :lifecycle="promotion.lifecycle" />
        </template>
      </PageHeader>
      <PromotionEditor :promotion="promotion" :read-only="!canUpdate" @saved="() => refresh()" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import type { PromotionDetail } from '#shared/schemas/promotions'

definePageMeta({
  layout: 'admin',
  title: 'Promoción',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Promociones', to: '/promotions' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const canUpdate = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))
const id = computed(() => String(route.params.id ?? ''))

const { data: promotion, status, error, refresh } = useAsyncData<PromotionDetail>(
  () => `admin-promotion-${id.value}`,
  () => request<PromotionDetail>(`/api/admin/promotions/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
useHead({ title: () => (promotion.value ? `${promotion.value.name} · Lumia Admin` : 'Promoción · Lumia Admin') })
</script>
