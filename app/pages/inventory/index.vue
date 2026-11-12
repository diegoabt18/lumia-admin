<template>
  <div>
    <PageHeader
      eyebrow="Catálogo"
      title="Inventario"
      description="Existencias por SKU. Disponible = en bodega − reservado por pedidos."
    >
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
          search-label="Buscar inventario"
          search-placeholder="Buscar por SKU o bodega…"
          @update:search="table.setSearch"
        />
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.sku"
          :loading="loading"
          :error="errorMessage"
          caption="Inventario por SKU"
          :empty-title="table.search.value ? 'Sin coincidencias' : 'No hay registros de inventario'"
          @retry="refresh"
        >
          <template #cell-sku="{ row }">
            <span class="block font-mono text-[12px] text-lumia-ink">{{ row.sku }}</span>
            <span v-if="row.variantName" class="block text-[12px] text-lumia-ink/50">{{ row.variantName }}</span>
          </template>
          <template #cell-productSlug="{ row }">
            <span v-if="row.productSlug" class="text-lumia-ink/75">{{ row.productSlug }}</span>
            <BaseBadge v-else tone="warning" title="El SKU no corresponde a ninguna variante">Sin variante</BaseBadge>
          </template>
          <template #cell-available="{ row }">
            <BaseBadge v-if="row.isPerOrder" tone="info">Por pedido</BaseBadge>
            <BaseBadge v-else :tone="row.available > 0 ? 'positive' : 'danger'">{{ row.available }}</BaseBadge>
            <span v-if="row.isPerOrder && row.depositPolicy" class="mt-1 block text-[12px] text-lumia-ink/55">
              Anticipo {{ describePolicy(row.depositPolicy) }}
            </span>
          </template>
          <template #cell-updatedAt="{ row }">
            <span class="text-[13px] text-lumia-ink/60">{{ row.updatedAt ? formatDateTime(row.updatedAt) : '—' }}</span>
          </template>
          <template v-if="canUpdate" #actions="{ row }">
            <BaseButton variant="ghost" size="sm" @click="openStock(row)">
              <template #icon>
                <IconAdjustments class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Ajustar</span>
            </BaseButton>
            <BaseButton v-if="row.isPerOrder" variant="ghost" size="sm" @click="openDeposit(row)">
              <template #icon>
                <IconCash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Anticipo</span>
            </BaseButton>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="registros"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>

    <StockAdjustDialog v-model:open="stockOpen" :target="stockTarget" @saved="refresh" />
    <DepositPolicyDialog v-model:open="depositOpen" :target="depositTarget" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconAdjustments, IconCash, IconRefresh } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { DEPOSIT_POLICY_LABELS, type DepositPolicyView, type InventoryRow } from '#shared/schemas/inventory'
import type { DepositPolicyTarget, StockTarget, TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Inventario',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Inventario' }],
})

const auth = useAuth()
const canUpdate = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<InventoryRow>(
  'admin-inventory',
  '/api/admin/inventory',
  table,
)

const columns: TableColumn[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'productSlug', label: 'Producto' },
  { key: 'warehouse', label: 'Bodega', hideOnMobile: true },
  { key: 'quantity', label: 'En bodega', align: 'right', class: 'tabular-nums' },
  { key: 'reserved', label: 'Reservado', align: 'right', class: 'tabular-nums' },
  { key: 'available', label: 'Disponible', align: 'right' },
  { key: 'updatedAt', label: 'Actualizado', hideOnMobile: true },
]

const stockOpen = ref(false)
const stockTarget = ref<StockTarget | null>(null)
function describePolicy(policy: DepositPolicyView): string {
  if (policy.type === 'fixed' || policy.type === 'custom_authorized') return `${DEPOSIT_POLICY_LABELS[policy.type]}: ${policy.value}`
  return `${policy.value}% ${policy.type === 'materials' ? 'de materiales' : 'del total'}`
}

const depositOpen = ref(false)
const depositTarget = ref<DepositPolicyTarget | null>(null)
function openDeposit(row: InventoryRow) {
  depositTarget.value = {
    sku: row.sku,
    label: row.variantName,
    isPerOrder: row.isPerOrder,
    depositPolicy: row.depositPolicy,
  }
  depositOpen.value = true
}

function openStock(row: InventoryRow) {
  stockTarget.value = {
    sku: row.sku,
    label: row.variantName,
    quantity: row.quantity,
    reserved: row.reserved,
    isPerOrder: row.isPerOrder,
    endpoint: `/api/admin/inventory/${encodeURIComponent(row.sku)}`,
  }
  stockOpen.value = true
}
</script>
