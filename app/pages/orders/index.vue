<template>
  <div>
    <PageHeader eyebrow="Ventas" title="Pedidos" description="Pedidos de la tienda online y ventas del POS, del más reciente al más antiguo.">
      <template #actions>
        <BaseButton variant="secondary" size="sm" :loading="loading" @click="refresh()">
          <template #icon>
            <IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          </template>
          Actualizar
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar pedidos"
          search-placeholder="Referencia ORD-XXXXXXXX, número interno, cliente, correo o teléfono…"
          @update:search="table.setSearch"
        >
          <template #filters>
            <div class="inline-flex rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Canal">
              <button
                v-for="opt in channelOptions"
                :key="opt.value"
                type="button"
                class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
                :class="channel === opt.value ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
                :aria-pressed="channel === opt.value"
                @click="setChannel(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>
        </TableToolbar>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Pedidos"
          :empty-title="table.search.value || channel ? 'Sin coincidencias' : 'Aún no hay pedidos'"
          @retry="refresh"
        >
          <template #cell-orderNumber="{ row }">
            <NuxtLink :to="`/orders/${row.id}`" class="font-medium text-lumia-ink hover:text-lumia-gold">
              {{ row.customerReference ?? row.orderNumber ?? row.id.slice(-8) }}
            </NuxtLink>
            <BaseBadge v-if="row.cancellationRequestStatus === 'requested'" tone="danger" class="ml-2">Pide cancelar</BaseBadge>
          </template>
          <template #cell-customer="{ row }">
            <span class="block text-lumia-ink/85">{{ row.customer ?? 'Sin nombre' }}</span>
            <span v-if="row.contact" class="block text-[12px] text-lumia-ink/45">{{ row.contact }}</span>
          </template>
          <template #cell-channel="{ row }">
            <span class="text-[13px] text-lumia-ink/70">{{ CHANNEL_LABELS[row.channel] }}</span>
          </template>
          <template #cell-total="{ row }">
            <span class="tabular-nums">{{ formatCurrency(row.total) }}</span>
          </template>
          <template #cell-status="{ row }">
            <OrderStatusBadge :status="row.status" />
          </template>
          <template #cell-paymentStatus="{ row }">
            <span class="text-[13px] text-lumia-ink/65">{{ paymentLabel(row.paymentStatus) }}</span>
          </template>
          <template #cell-createdAt="{ row }">
            <span class="text-[13px] text-lumia-ink/60">{{ row.createdAt ? formatDateTime(row.createdAt) : '—' }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton :to="`/orders/${row.id}`" variant="ghost" size="sm">
              <template #icon>
                <IconChevronRight class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only">Ver pedido {{ row.orderNumber ?? row.id }}</span>
            </BaseButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="pedidos"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconChevronRight, IconRefresh } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { CHANNEL_LABELS, PAYMENT_STATUS_LABELS, type OrderRow } from '#shared/schemas/orders'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Pedidos',
  permissions: [PERMISSIONS.ORDERS_READ],
  breadcrumbs: [{ label: 'Ventas' }, { label: 'Pedidos' }],
})

const route = useRoute()
const router = useRouter()
const table = useTableQuery({ allowedLimits: [20, 50, 100] })

const channel = computed<'' | 'online' | 'pos'>(() => {
  const v = route.query.channel
  return v === 'online' || v === 'pos' ? v : ''
})
const channelOptions = [
  { value: '' as const, label: 'Todos' },
  { value: 'online' as const, label: 'Online' },
  { value: 'pos' as const, label: 'POS' },
]
function setChannel(value: '' | 'online' | 'pos') {
  const query = { ...route.query, channel: value || undefined, page: undefined }
  void router.replace({ query })
}

const { rows, pagination, loading, errorMessage, refresh } = useServerList<OrderRow>(
  'admin-orders',
  '/api/admin/orders',
  table,
  computed(() => ({ channel: channel.value || undefined })),
)

const columns: TableColumn[] = [
  { key: 'orderNumber', label: 'Pedido' },
  { key: 'customer', label: 'Cliente' },
  { key: 'channel', label: 'Canal', hideOnMobile: true },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Estado' },
  { key: 'paymentStatus', label: 'Pago', hideOnMobile: true },
  { key: 'createdAt', label: 'Fecha', hideOnMobile: true },
]

function paymentLabel(value: string | null) {
  return value ? (PAYMENT_STATUS_LABELS[value] ?? value) : '—'
}
</script>
