<template>
  <div>
    <div v-if="loading && !order" class="space-y-4">
      <BaseSkeleton class="h-10 w-64" />
      <BaseSkeleton class="h-72 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !order"
      :title="loadError.status === 404 ? 'Pedido no encontrado' : 'No se pudo cargar el pedido'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="order">
      <PageHeader :eyebrow="CHANNEL_LABELS[order.channel]" :title="`Pedido ${order.customerReference ?? order.orderNumber ?? order.id.slice(-8)}`" :description="order.createdAt ? `Creado ${formatDateTime(order.createdAt)}` : undefined">
        <template #actions>
          <OrderStatusBadge :status="order.status" />
          <template v-if="canUpdate">
            <BaseButton
              v-for="next in transitions"
              :key="next"
              :variant="next === 'cancelled' ? 'secondary' : 'primary'"
              size="sm"
              :disabled="busy"
              @click="startTransition(next)"
            >
              {{ TRANSITION_COPY[next].action }}
            </BaseButton>
          </template>
        </template>
      </PageHeader>
      <OrderReferences
        v-if="order.customerReference || order.orderNumber"
        class="mb-6"
        :customer-reference="order.customerReference ?? order.orderNumber ?? ''"
        :internal-id="order.orderNumber ?? order.id"
      />

      <!-- Solicitud de cancelación abierta -->
      <div
        v-if="openCancellationRequest"
        role="status"
        class="mb-6 rounded-2xl border border-status-danger/20 bg-status-danger-soft/40 p-5"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="flex items-center gap-2 text-sm font-semibold text-status-danger">
              <IconAlertTriangle class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              El cliente solicitó cancelar este pedido
              <BaseBadge tone="danger">{{ CANCELLATION_STATUS_LABELS[order.cancellation.requestStatus ?? ''] }}</BaseBadge>
            </p>
            <p v-if="order.cancellation.requestReason" class="mt-1.5 text-sm text-lumia-ink/75">“{{ order.cancellation.requestReason }}”</p>
            <p v-if="order.cancellation.requestedAt" class="mt-1 text-[12px] text-lumia-ink/50">{{ formatDateTime(order.cancellation.requestedAt) }}</p>
          </div>
          <div v-if="canUpdate" class="flex flex-wrap gap-2">
            <BaseButton variant="danger" size="sm" :disabled="busy" @click="startResolution('approved')">Aprobar</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="startResolution('rejected')">Rechazar</BaseButton>
            <BaseButton variant="ghost" size="sm" :disabled="busy" @click="startResolution('info_needed')">Pedir información</BaseButton>
          </div>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <BaseCard title="Productos">
            <DataTable :columns="itemColumns" :rows="order.items" caption="Productos del pedido" empty-title="El pedido no tiene líneas">
              <template #cell-name="{ row }">
                <span class="block font-medium text-lumia-ink">{{ row.name }}</span>
                <span v-if="row.variantLabel || row.variantSku" class="block text-[12px] text-lumia-ink/50">
                  {{ [row.variantLabel, row.variantSku].filter(Boolean).join(' · ') }}
                </span>
              </template>
              <template #cell-unitPrice="{ row }"><span class="tabular-nums">{{ formatCurrency(row.unitPrice) }}</span></template>
              <template #cell-subtotal="{ row }"><span class="tabular-nums">{{ formatCurrency(row.subtotal) }}</span></template>
            </DataTable>

            <dl class="mt-4 space-y-1.5 border-t border-lumia-ink/[0.06] pt-4 text-sm">
              <div class="flex justify-between"><dt class="text-lumia-ink/60">Subtotal</dt><dd class="tabular-nums">{{ formatCurrency(order.totals.subtotal) }}</dd></div>
              <div v-if="order.totals.discountAmount" class="flex justify-between"><dt class="text-lumia-ink/60">Descuento</dt><dd class="tabular-nums">−{{ formatCurrency(order.totals.discountAmount) }}</dd></div>
              <div class="flex justify-between"><dt class="text-lumia-ink/60">Envío</dt><dd class="tabular-nums">{{ formatCurrency(order.totals.shippingCost) }}</dd></div>
              <div v-if="order.totals.tax" class="flex justify-between"><dt class="text-lumia-ink/60">IVA incluido</dt><dd class="tabular-nums">{{ formatCurrency(order.totals.tax) }}</dd></div>
              <div class="flex justify-between border-t border-lumia-ink/[0.06] pt-2 text-base font-semibold text-lumia-ink">
                <dt>Total</dt><dd class="font-display text-2xl tabular-nums">{{ formatCurrency(order.totals.total) }}</dd>
              </div>
            </dl>
          </BaseCard>

          <BaseCard title="Notas internas" description="Visibles solo para el equipo.">
            <form novalidate @submit.prevent="saveNotes">
              <FormField id="order-notes" label="Notas" :error="notesError ?? undefined" hint="Máximo 2000 caracteres.">
                <template #default="{ id, invalid, describedBy }">
                  <BaseTextarea :id="id" v-model="notes" :rows="3" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="!canUpdate || savingNotes" />
                </template>
              </FormField>
              <div v-if="canUpdate" class="mt-3 flex justify-end">
                <BaseButton type="submit" size="sm" :loading="savingNotes" :disabled="notes === (order.notes ?? '')">Guardar notas</BaseButton>
              </div>
            </form>
          </BaseCard>
        </div>

        <div class="space-y-6">
          <BaseCard title="Cliente">
            <dl class="space-y-2.5 text-sm">
              <div><dt class="text-[12px] text-lumia-ink/50">Nombre</dt><dd class="text-lumia-ink">{{ order.customer.name ?? '—' }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Teléfono</dt><dd class="text-lumia-ink">{{ order.customer.phone ?? '—' }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Email</dt><dd class="break-all text-lumia-ink">{{ order.customer.email ?? '—' }}</dd></div>
            </dl>
          </BaseCard>

          <BaseCard :title="order.fulfillment === 'in_store' ? 'Entrega en tienda' : 'Envío'">
            <dl v-if="order.fulfillment === 'delivery'" class="space-y-2.5 text-sm">
              <div><dt class="text-[12px] text-lumia-ink/50">Dirección</dt><dd class="text-lumia-ink">{{ order.shipping.address || '—' }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Ciudad</dt><dd class="text-lumia-ink">{{ order.shipping.city || '—' }}</dd></div>
              <div v-if="order.shipping.reference"><dt class="text-[12px] text-lumia-ink/50">Referencia</dt><dd class="text-lumia-ink">{{ order.shipping.reference }}</dd></div>
            </dl>
            <p v-else class="text-sm text-lumia-ink/60">El cliente recoge el pedido en la tienda.</p>
          </BaseCard>

          <BaseCard title="Pago">
            <dl class="space-y-2.5 text-sm">
              <div><dt class="text-[12px] text-lumia-ink/50">Estado del pago</dt><dd class="text-lumia-ink">{{ order.paymentStatus ? (PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus) : '—' }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Método</dt><dd class="text-lumia-ink">{{ order.paymentMethod ?? '—' }}</dd></div>
              <div v-if="order.paidAt"><dt class="text-[12px] text-lumia-ink/50">Pagado</dt><dd class="text-lumia-ink">{{ formatDateTime(order.paidAt) }}</dd></div>
            </dl>
          </BaseCard>

          <BaseCard title="Pagos y saldo">
            <OrderPaymentsPanel :order-id="order.id" :can-update="canUpdate" @changed="refresh" />
          </BaseCard>

          <BaseCard title="Historial">
            <ol class="relative space-y-4 border-l border-lumia-ink/10 pl-5">
              <li v-for="(event, i) in order.events" :key="`${event.timestamp}-${i}`" class="relative">
                <span class="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-lumia-gold" aria-hidden="true" />
                <p class="text-sm text-lumia-ink">{{ ORDER_EVENT_LABELS[event.type] ?? event.type }}</p>
                <p class="text-[12px] text-lumia-ink/50">{{ formatDateTime(event.timestamp) }} · {{ sourceLabel(event.source) }}</p>
              </li>
            </ol>
          </BaseCard>
        </div>
      </div>

      <NoteActionDialog
        v-model:open="cancelOpen"
        title="Cancelar pedido"
        description="Si ya se había descontado stock, el servidor lo repone. Los reembolsos no se gestionan desde aquí."
        note-label="Motivo de la cancelación"
        confirm-label="Cancelar pedido"
        tone="danger"
        :busy="busy"
        @confirm="(note) => applyStatus('cancelled', note)"
      />

      <NoteActionDialog
        v-model:open="resolutionOpen"
        :title="resolution ? RESOLUTION_COPY[resolution].title : ''"
        :description="resolution ? RESOLUTION_COPY[resolution].description : undefined"
        note-label="Nota (opcional)"
        :confirm-label="resolution ? RESOLUTION_COPY[resolution].action : ''"
        :tone="resolution === 'approved' ? 'danger' : 'default'"
        :note-required="resolution === 'info_needed'"
        :busy="busy"
        @confirm="applyResolution"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  allowedTransitions,
  CANCELLATION_STATUS_LABELS,
  CHANNEL_LABELS,
  ORDER_EVENT_LABELS,
  PAYMENT_STATUS_LABELS,
  type CancellationResolveBody,
  type OrderDetail,
  type OrderStatus,
} from '#shared/schemas/orders'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Pedido',
  permissions: [PERMISSIONS.ORDERS_READ],
  breadcrumbs: [{ label: 'Ventas' }, { label: 'Pedidos', to: '/orders' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canUpdate = computed(() => auth.can(PERMISSIONS.ORDERS_UPDATE))

const { data: order, status, error, refresh } = useAsyncData<OrderDetail>(
  () => `admin-order-${id.value}`,
  () => request<OrderDetail>(`/api/admin/orders/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))

useHead({ title: () => (order.value ? `Pedido ${order.value.customerReference ?? order.value.orderNumber ?? ''} · Lumia Admin` : 'Pedido · Lumia Admin') })

const busy = ref(false)

// ---------- Transiciones de estado ----------
type Transition = Exclude<OrderStatus, 'pending' | 'expired'>
const TRANSITION_COPY: Record<Transition, { action: string; title: string; description: string }> = {
  paid: {
    action: 'Confirmar pago',
    title: 'Confirmar pago recibido',
    description: 'Úsalo solo si ya verificaste el dinero. El servidor descontará el stock de los productos.',
  },
  shipped: { action: 'Marcar enviado', title: 'Marcar como enviado', description: 'El pedido salió hacia el cliente.' },
  delivered: {
    action: 'Marcar entregado',
    title: 'Marcar como entregado',
    description: 'El cliente recibió el pedido. Se registrará el ingreso contable de la venta.',
  },
  cancelled: { action: 'Cancelar pedido', title: 'Cancelar pedido', description: '' },
}

const transitions = computed(() =>
  order.value ? (allowedTransitions(order.value) as Transition[]) : [],
)

async function startTransition(next: Transition) {
  if (next === 'cancelled') {
    cancelOpen.value = true
    return
  }
  const copy = TRANSITION_COPY[next]
  if (await confirm({ title: copy.title, description: copy.description, confirmLabel: copy.action })) {
    await applyStatus(next)
  }
}

const cancelOpen = ref(false)

async function applyStatus(next: Transition, note?: string) {
  if (!order.value || busy.value) return
  busy.value = true
  try {
    await request(`/api/admin/orders/${order.value.id}/status`, {
      method: 'POST',
      body: { status: next, ...(note ? { cancellationReason: note } : {}) },
    })
    cancelOpen.value = false
    toast.success('Pedido actualizado', TRANSITION_COPY[next].title)
  } catch (e) {
    toast.error('No se pudo actualizar el pedido', toUiError(e).message)
  } finally {
    busy.value = false
    await refresh()
  }
}

// ---------- Solicitud de cancelación ----------
const openCancellationRequest = computed(() => {
  const s = order.value?.cancellation.requestStatus
  return s === 'requested' || s === 'info_needed'
})

type Resolution = CancellationResolveBody['resolution']
const RESOLUTION_COPY: Record<Resolution, { title: string; description: string; action: string }> = {
  approved: { title: 'Aprobar cancelación', description: 'El pedido quedará cancelado y el stock se repondrá.', action: 'Aprobar' },
  rejected: { title: 'Rechazar cancelación', description: 'El pedido sigue su curso normal.', action: 'Rechazar' },
  info_needed: { title: 'Pedir información', description: 'Indica qué necesitas saber del cliente.', action: 'Enviar' },
}
const resolution = ref<Resolution | null>(null)
const resolutionOpen = ref(false)

function startResolution(value: Resolution) {
  resolution.value = value
  resolutionOpen.value = true
}

async function applyResolution(note: string) {
  if (!order.value || !resolution.value || busy.value) return
  busy.value = true
  try {
    await request(`/api/admin/orders/${order.value.id}/cancellation`, {
      method: 'POST',
      body: { resolution: resolution.value, ...(note ? { adminNote: note } : {}) },
    })
    resolutionOpen.value = false
    toast.success('Solicitud resuelta', RESOLUTION_COPY[resolution.value].title)
  } catch (e) {
    toast.error('No se pudo resolver la solicitud', toUiError(e).message)
  } finally {
    busy.value = false
    await refresh()
  }
}

// ---------- Notas ----------
const notes = ref('')
const notesError = ref<string | null>(null)
const savingNotes = ref(false)
watch(order, (o) => {
  notes.value = o?.notes ?? ''
}, { immediate: true })

async function saveNotes() {
  if (!order.value || savingNotes.value) return
  if (notes.value.length > 2000) {
    notesError.value = 'Máximo 2000 caracteres.'
    return
  }
  notesError.value = null
  savingNotes.value = true
  try {
    await request(`/api/admin/orders/${order.value.id}/notes`, { method: 'PUT', body: { notes: notes.value } })
    toast.success('Notas guardadas')
    await refresh()
  } catch (e) {
    const ui = toUiError(e)
    notesError.value = ui.fieldErrors.notes?.[0] ?? null
    toast.error('No se pudieron guardar las notas', ui.message)
  } finally {
    savingNotes.value = false
  }
}

// ---------- Tabla de líneas ----------
const itemColumns: TableColumn[] = [
  { key: 'name', label: 'Producto' },
  { key: 'quantity', label: 'Cant.', align: 'right', class: 'tabular-nums w-20' },
  { key: 'unitPrice', label: 'Precio', align: 'right' },
  { key: 'subtotal', label: 'Subtotal', align: 'right' },
]

function sourceLabel(source: string) {
  return ({ admin: 'Administrador', system: 'Sistema', customer: 'Cliente', pos: 'POS' } as Record<string, string>)[source] ?? source
}
</script>
