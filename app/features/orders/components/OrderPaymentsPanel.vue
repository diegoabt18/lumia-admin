<template>
  <div>
    <p v-if="loadError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
      {{ loadError }}
    </p>
    <p v-else-if="loading && !summary" class="text-[13px] text-lumia-ink/55">Cargando pagos…</p>

    <template v-else-if="summary">
      <dl class="space-y-2.5 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-lumia-ink/60">Total del pedido</dt>
          <dd class="tabular-nums text-lumia-ink">{{ formatCurrency(summary.total) }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-lumia-ink/60">Anticipo requerido</dt>
          <dd class="tabular-nums text-lumia-ink">{{ formatCurrency(summary.initialPaymentRequired) }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-lumia-ink/60">Pagado</dt>
          <dd class="tabular-nums text-lumia-ink">{{ formatCurrency(summary.paidAmount) }}</dd>
        </div>
        <div class="flex justify-between gap-3 border-t border-lumia-ink/8 pt-2.5 font-medium">
          <dt class="text-lumia-ink">Saldo pendiente</dt>
          <dd class="tabular-nums text-lumia-ink">
            {{ formatCurrency(summary.balanceDue) }}
            <BaseBadge class="ml-2" :tone="summary.balanceDue > 0 ? 'warning' : 'positive'">
              {{ PAYMENT_STATUS_LABELS[summary.paymentStatus] ?? summary.paymentStatus }}
            </BaseBadge>
          </dd>
        </div>
      </dl>

      <div v-if="summary.lines.length" class="mt-5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-lumia-ink/45">Por línea</p>
        <ul class="mt-2 divide-y divide-lumia-ink/8">
          <li v-for="line in summary.lines" :key="line.index" class="py-2.5 text-[13px]">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-lumia-ink">{{ line.name }}</span>
              <BaseBadge :tone="line.fulfillmentMode === 'made_to_order' ? 'info' : 'neutral'">
                {{ line.fulfillmentMode === 'made_to_order' ? 'Por pedido' : 'Stock' }}
              </BaseBadge>
            </div>
            <p class="mt-1 tabular-nums text-[12px] text-lumia-ink/60">
              Total {{ formatCurrency(line.lineTotal) }} · Anticipo {{ formatCurrency(line.initialPaymentRequired) }} ·
              Pagado {{ formatCurrency(line.paidAmount) }} · Saldo {{ formatCurrency(line.balanceDue) }}
            </p>
          </li>
        </ul>
      </div>

      <div class="mt-5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-lumia-ink/45">Pagos registrados</p>
        <p v-if="!paymentsApproved.length" class="mt-2 text-[13px] text-lumia-ink/55">Aún no hay pagos aprobados.</p>
        <ul v-else class="mt-2 divide-y divide-lumia-ink/8">
          <li v-for="(payment, i) in paymentsApproved" :key="payment.id ?? i" class="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
            <span class="text-lumia-ink/75">
              {{ METHOD_LABELS[payment.method] ?? payment.method }}
              <span v-if="payment.reference" class="text-lumia-ink/50"> · ref. {{ payment.reference }}</span>
              <span v-if="payment.changeGiven" class="text-lumia-ink/50"> · cambio {{ formatCurrency(payment.changeGiven) }}</span>
            </span>
            <span class="tabular-nums text-lumia-ink">{{ formatCurrency(payment.amount) }}</span>
          </li>
        </ul>
      </div>

      <form
        v-if="canUpdate && summary.balanceDue > 0"
        :id="formId"
        novalidate
        class="mt-6 space-y-3 rounded-xl border border-lumia-ink/8 bg-lumia-cream/40 p-4"
        @submit.prevent="submit"
      >
        <p class="text-[13px] font-medium text-lumia-ink">Registrar abono</p>
        <FormField :id="`${formId}-method`" label="Método" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="method" :options="METHOD_OPTIONS" :disabled="saving" />
          </template>
        </FormField>
        <FormField
          :id="`${formId}-amount`"
          label="Importe exacto"
          :hint="summary.initialRemaining > 0 ? 'Anticipo pendiente: debe pagarse completo, sin abonos parciales.' : 'Anticipo pagado: registra el saldo completo para confirmar el pedido.'"
          required
        >
          <template #default="{ id }">
            <p :id="id" class="rounded-lg bg-white px-3 py-2 text-sm font-medium tabular-nums text-lumia-ink">
              {{ formatCurrency(summary.nextPaymentRequired) }}
            </p>
          </template>
        </FormField>
        <FormField
          v-if="method === 'cash'"
          :id="`${formId}-received`"
          label="Efectivo recibido"
          hint="Debe cubrir el importe. La diferencia es el cambio."
        >
          <template #default="{ id }">
            <BaseInput :id="id" v-model="received" inputmode="decimal" placeholder="0" class="tabular-nums" :disabled="saving" />
          </template>
        </FormField>
        <FormField v-else :id="`${formId}-reference`" label="Referencia bancaria" hint="Solo tras verificar el depósito en la cuenta." required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="reference" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-note`" label="Nota (opcional)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="note" maxlength="500" :disabled="saving" />
          </template>
        </FormField>
        <p v-if="formError" role="alert" class="text-[13px] text-status-danger">{{ formError }}</p>
        <div class="flex justify-end">
          <BaseButton type="submit" :loading="saving">Registrar abono</BaseButton>
        </div>
      </form>

      <p v-else-if="summary.balanceDue <= 0" class="mt-6 text-[13px] text-lumia-ink/55">
        El saldo está cubierto. El pedido queda pagado.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  orderPaymentRegisterBodySchema,
  PAYMENT_STATUS_LABELS,
  type OrderPaymentSummary,
} from '#shared/schemas/orders'

const props = defineProps<{ orderId: string; canUpdate: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()

const summary = ref<OrderPaymentSummary | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', bank_transfer: 'Transferencia', manual: 'Acordado con el vendedor' }
const METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
]

const method = ref<'cash' | 'bank_transfer'>('cash')
const amount = ref('')
const received = ref('')
const reference = ref('')
const note = ref('')

// Solo cuenta lo confirmado: los pagos pendientes no son dinero recibido.
const paymentsApproved = computed(() => (summary.value?.payments ?? []).filter((p) => p.status === 'approved'))

async function loadSummary() {
  loading.value = true
  loadError.value = null
  try {
    summary.value = await request<OrderPaymentSummary>(`/api/admin/orders/${props.orderId}/payments`)
  } catch (error) {
    loadError.value = toUiError(error).message
  } finally {
    loading.value = false
  }
}

watch(() => props.orderId, loadSummary, { immediate: true })

let submitKey: { fingerprint: string; key: string } | null = null

async function submit() {
  formError.value = null
  const parsed = orderPaymentRegisterBodySchema.safeParse({
    method: method.value,
    amount: summary.value?.nextPaymentRequired,
    ...(method.value === 'cash'
      ? { receivedAmount: received.value.trim() === '' ? null : Number(received.value) }
      : { transferReference: reference.value.trim() || null }),
    ...(note.value.trim() ? { note: note.value.trim() } : {}),
  })
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? 'Revisa los datos del abono.'
    return
  }
  // Mismo abono reintentado → misma clave (no cobra dos veces); cambios → clave nueva.
  const fingerprint = JSON.stringify(parsed.data)
  if (!submitKey || submitKey.fingerprint !== fingerprint) {
    submitKey = { fingerprint, key: crypto.randomUUID() }
  }

  saving.value = true
  try {
    summary.value = await request<OrderPaymentSummary>(`/api/admin/orders/${props.orderId}/payments`, {
      method: 'POST',
      body: { ...parsed.data, idempotencyKey: submitKey.key },
    })
    submitKey = null
    amount.value = ''
    received.value = ''
    reference.value = ''
    note.value = ''
    toast.success('Pago registrado', 'El saldo se actualizó.')
    emit('changed')
  } catch (error) {
    formError.value = toUiError(error).message
  } finally {
    saving.value = false
  }
}
</script>
