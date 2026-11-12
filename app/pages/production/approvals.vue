<template>
  <div>
    <PageHeader eyebrow="Producción" title="Aprobaciones de precio" description="Solicitudes creadas al enviar productos a aprobación. Publicar es lo único que cambia el precio de la tienda." />
    <ProductionTabs />

    <div class="mb-4 flex gap-1 overflow-x-auto border-b border-lumia-ink/[0.08]" role="tablist" aria-label="Estado de las solicitudes">
      <button
        v-for="s in APPROVAL_STATUSES"
        :key="s"
        type="button"
        role="tab"
        :aria-selected="status === s"
        class="-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[14px] font-medium transition-colors"
        :class="status === s ? 'border-lumia-ink text-lumia-ink' : 'border-transparent text-lumia-ink/55 hover:text-lumia-ink'"
        @click="setStatus(s)"
      >
        {{ APPROVAL_STATUS_LABELS[s] }} <span class="tabular-nums opacity-60">{{ data?.summary[s] ?? '' }}</span>
      </button>
    </div>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Solicitudes de precio"
          :empty-title="`No hay solicitudes ${APPROVAL_STATUS_LABELS[status].toLowerCase()}`"
          @retry="refresh"
        >
          <template #cell-product="{ row }">
            <span class="block font-medium text-lumia-ink">{{ row.productName }}</span>
            <code class="block text-[11px] text-lumia-ink/50">{{ row.variantSku }}<template v-if="row.recipeVersion"> · receta v{{ row.recipeVersion }}</template></code>
          </template>
          <template #cell-price="{ row }">
            <span class="block whitespace-nowrap tabular-nums">
              {{ formatCurrency(row.previousPrice) }} → <strong>{{ formatCurrency(row.suggestedPrice) }}</strong>
            </span>
            <span v-if="row.priceBasis === 'tax_included'" class="block text-[11px] text-lumia-ink/50">IVA {{ row.approvalTaxRate ?? 0 }} % incluido · base {{ formatCurrency(row.suggestedPriceNet ?? 0) }}</span>
            <span v-else class="block text-[11px] text-status-warning">
              Regla anterior: sin IVA<template v-if="row.taxRate"> (con IVA ≈ {{ formatCurrency(priceWithTax(row.suggestedPrice, row.taxRate) ?? 0) }})</template>. No se puede publicar.
            </span>
            <span v-if="row.currentPrice !== null && row.currentPrice !== row.previousPrice" class="block text-[11px] text-status-danger">Precio actual: {{ formatCurrency(row.currentPrice) }} (cambió)</span>
          </template>
          <template #cell-cost="{ row }">
            <span class="whitespace-nowrap tabular-nums text-lumia-ink/70">{{ formatUnitCost(row.newCost) }}</span>
            <span v-if="row.marginPercentage !== null" class="block text-[11px] text-lumia-ink/45">margen {{ row.marginPercentage }} %</span>
          </template>
          <template #cell-date="{ row }">
            <span class="whitespace-nowrap tabular-nums text-lumia-ink/60">{{ formatDateTime((status === 'published' ? row.publishedAt : row.createdAt) ?? '') }}</span>
            <span v-if="row.rejectedReason" class="block text-[11px] text-lumia-ink/55">{{ row.rejectedReason }}</span>
            <BaseBadge v-if="row.createdBy && row.createdBy === me" tone="neutral" class="mt-1">Creada por ti</BaseBadge>
          </template>
          <template v-if="canManage && (status === 'pending' || status === 'approved')" #actions="{ row }">
            <template v-if="status === 'pending'">
              <BaseButton variant="ghost" size="sm" :loading="busyId === row.id" :disabled="busyId !== null" @click="approve(row)">Aprobar</BaseButton>
              <BaseButton variant="ghost" size="sm" :disabled="busyId !== null" @click="openReject(row)">Rechazar</BaseButton>
            </template>
            <BaseButton v-else size="sm" :variant="row.priceBasis === 'tax_included' ? 'primary' : 'secondary'" :disabled="busyId !== null" @click="openPublish(row)">
              {{ row.priceBasis === 'tax_included' ? 'Publicar' : 'Ver' }}
            </BaseButton>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="solicitudes"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
        <p v-if="status === 'approved'" class="text-[12px] text-lumia-ink/50">Las solicitudes aprobadas no se pueden rechazar en el servidor: si una ya no aplica (o es de la regla anterior, sin IVA), vuelve a enviar el producto para generar otra.</p>
      </div>
    </BaseCard>

    <BaseDialog v-model:open="rejectOpen" title="Rechazar solicitud" :description="rejecting ? `${rejecting.productName} · ${rejecting.variantSku}` : undefined" :busy="busyId !== null">
      <form :id="rejectFormId" novalidate @submit.prevent="reject">
        <FormField :id="`${rejectFormId}-reason`" label="Motivo" :error="rejectError ?? undefined" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseTextarea :id="id" v-model="rejectReason" :rows="3" maxlength="500" :invalid="invalid" :described-by="describedBy" />
          </template>
        </FormField>
      </form>
      <template #footer>
        <BaseButton variant="secondary" :disabled="busyId !== null" @click="rejectOpen = false">Cancelar</BaseButton>
        <BaseButton type="submit" :form="rejectFormId" variant="danger" :loading="busyId !== null">Rechazar</BaseButton>
      </template>
    </BaseDialog>

    <PublishPriceDialog v-model:open="publishOpen" :approval="publishing" :current-user-id="me" @published="refresh" />
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUSES,
  priceWithTax,
  rejectBodySchema,
  type ApprovalList,
  type ApprovalRow,
  type ApprovalStatus,
} from '#shared/schemas/costing'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Aprobaciones de precio',
  permissions: [PERMISSIONS.COSTING_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Aprobaciones' }],
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const canManage = computed(() => auth.can(PERMISSIONS.COSTING_MANAGE))
const me = computed(() => auth.session.value?.user.id ?? null)

const status = computed<ApprovalStatus>(() => {
  const v = route.query.status
  return (APPROVAL_STATUSES as readonly unknown[]).includes(v) ? (v as ApprovalStatus) : 'pending'
})
function setStatus(value: ApprovalStatus) {
  void router.replace({ query: { status: value === 'pending' ? undefined : value } })
}

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const { data, status: fetchStatus, error, refresh } = useAsyncData<ApprovalList>(
  'admin-production-approvals',
  () => request<ApprovalList>('/api/admin/production/approvals', { query: { status: status.value, page: table.page.value, limit: table.limit.value } }),
  { watch: [status, table.page, table.limit] },
)
const rows = computed(() => data.value?.items ?? [])
const pagination = computed(() => data.value?.pagination ?? null)
const loading = computed(() => fetchStatus.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const columns: TableColumn[] = [
  { key: 'product', label: 'Producto' },
  { key: 'price', label: 'Precio' },
  { key: 'cost', label: 'Costo', align: 'right', class: 'w-32', hideOnMobile: true },
  { key: 'date', label: 'Fecha', class: 'w-44', hideOnMobile: true },
]

const busyId = ref<string | null>(null)

async function approve(row: ApprovalRow) {
  if (busyId.value) return
  const ok = await confirm({
    title: 'Aprobar precio',
    description: `${row.productName} (${row.variantSku}): ${formatCurrency(row.previousPrice)} → ${formatCurrency(row.suggestedPrice)}. Aprobar no cambia el precio de la tienda: después hay que publicarlo.${row.createdBy && row.createdBy === me.value ? ' Tú creaste esta solicitud.' : ''}`,
    confirmLabel: 'Aprobar',
  })
  if (!ok) return
  busyId.value = row.id
  try {
    await request(`/api/admin/production/approvals/${row.id}/approve`, { method: 'POST' })
    toast.success('Solicitud aprobada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo aprobar', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

const rejectOpen = ref(false)
const rejecting = ref<ApprovalRow | null>(null)
const rejectReason = ref('')
const rejectError = ref<string | null>(null)
const rejectFormId = useId()
function openReject(row: ApprovalRow) {
  rejecting.value = row
  rejectReason.value = ''
  rejectError.value = null
  rejectOpen.value = true
}
async function reject() {
  if (!rejecting.value || busyId.value) return
  const parsed = rejectBodySchema.safeParse({ reason: rejectReason.value })
  if (!parsed.success) {
    rejectError.value = parsed.error.issues[0]?.message ?? 'Motivo inválido.'
    return
  }
  busyId.value = rejecting.value.id
  try {
    await request(`/api/admin/production/approvals/${rejecting.value.id}/reject`, { method: 'POST', body: parsed.data })
    toast.success('Solicitud rechazada')
    rejectOpen.value = false
    await refresh()
  } catch (e) {
    rejectError.value = toUiError(e).message
  } finally {
    busyId.value = null
  }
}

const publishOpen = ref(false)
const publishing = ref<ApprovalRow | null>(null)
function openPublish(row: ApprovalRow) {
  publishing.value = row
  publishOpen.value = true
}
</script>
