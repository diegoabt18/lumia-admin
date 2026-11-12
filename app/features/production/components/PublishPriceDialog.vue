<template>
  <BaseDialog v-model:open="open" title="Publicar precio en la tienda" :description="approval ? `${approval.productName} · ${approval.variantSku}` : undefined" :busy="publishing">
    <div v-if="approval" class="space-y-4 text-sm">
      <p v-if="legacy" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-3 py-2.5 text-[13px] text-status-danger">
        Esta solicitud se creó con la regla anterior: su precio ({{ formatCurrency(approval.suggestedPrice) }}) no incluye IVA y el servidor no la publica.
        Vuelve a enviar el producto a aprobación para generar una con el precio final.
      </p>

      <template v-else>
        <dl class="grid grid-cols-2 gap-3 rounded-xl bg-lumia-cream/60 p-4">
          <div>
            <dt class="text-[12px] text-lumia-ink/55">Precio actual</dt>
            <dd class="tabular-nums text-lumia-ink">{{ formatCurrency(approval.currentPrice ?? approval.previousPrice) }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-lumia-ink/55">Precio que se publicará</dt>
            <dd class="font-display text-[1.4rem] leading-none tabular-nums text-lumia-ink">{{ formatCurrency(approval.suggestedPrice) }}</dd>
            <dd class="text-[11px] text-lumia-ink/50">IVA {{ approval.approvalTaxRate ?? 0 }} % incluido</dd>
          </div>
          <div>
            <dt class="text-[12px] text-lumia-ink/55">Base sin IVA · costo</dt>
            <dd class="tabular-nums text-lumia-ink/75">{{ formatUnitCost(approval.suggestedPriceNet ?? 0) }} · {{ formatUnitCost(approval.newCost) }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-lumia-ink/55">Cambio de precio · recargo real</dt>
            <dd class="tabular-nums text-lumia-ink/75">{{ changeText }} · {{ markupText }}</dd>
          </div>
        </dl>

        <p v-if="priceChanged" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-3 py-2.5 text-[13px] text-status-danger">
          El precio de la variante cambió desde que se creó la solicitud ({{ formatCurrency(approval.previousPrice) }} → {{ formatCurrency(approval.currentPrice ?? 0) }}). No se puede publicar: recházala y vuelve a enviar el producto.
        </p>
        <p v-else-if="taxChanged" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-3 py-2.5 text-[13px] text-status-danger">
          El IVA del producto cambió ({{ approval.approvalTaxRate }} % → {{ approval.taxRate }} %) desde que se creó la solicitud. Vuelve a enviar el producto.
        </p>
      </template>

      <p v-if="createdByMe && !legacy" class="text-[12px] text-lumia-ink/60">Tú creaste esta solicitud. Si es posible, que otra persona revise antes de publicar.</p>
      <p v-if="error" role="alert" class="text-[13px] text-status-danger">{{ error }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="publishing" @click="open = false">{{ legacy ? 'Cerrar' : 'Cancelar' }}</BaseButton>
      <BaseButton v-if="!legacy" :loading="publishing" :disabled="!canPublish" @click="publish">Publicar precio</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { ApprovalRow } from '#shared/schemas/costing'

const props = defineProps<{ approval: ApprovalRow | null; currentUserId: string | null }>()
const emit = defineEmits<{ published: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const publishing = ref(false)
const error = ref<string | null>(null)

watch(open, (v) => {
  if (v) error.value = null
})

const legacy = computed(() => props.approval?.priceBasis !== 'tax_included')
const priceChanged = computed(() => Boolean(props.approval && props.approval.currentPrice !== null && props.approval.currentPrice !== props.approval.previousPrice))
const taxChanged = computed(() => Boolean(props.approval && props.approval.taxRate !== null && props.approval.taxRate !== props.approval.approvalTaxRate))
const createdByMe = computed(() => Boolean(props.approval?.createdBy && props.approval.createdBy === props.currentUserId))

const changeText = computed(() => {
  const a = props.approval
  if (!a) return ''
  const base = a.currentPrice ?? a.previousPrice
  if (!base) return '—'
  const pct = Math.round(((a.suggestedPrice - base) / base) * 100)
  return `${pct > 0 ? '+' : ''}${pct} %`
})
const markupText = computed(() => {
  const a = props.approval
  if (!a || a.suggestedPriceNet === null || !a.newCost) return '—'
  return `${Math.round(((a.suggestedPriceNet - a.newCost) / a.newCost) * 100)} %`
})

const canPublish = computed(() => Boolean(props.approval) && !legacy.value && !priceChanged.value && !taxChanged.value && !publishing.value)

async function publish() {
  if (!props.approval || !canPublish.value) return
  publishing.value = true
  error.value = null
  try {
    await request(`/api/admin/production/approvals/${props.approval.id}/publish`, { method: 'POST', body: {} })
    toast.success('Precio publicado en la tienda')
    open.value = false
    emit('published')
  } catch (e) {
    error.value = toUiError(e).message
  } finally {
    publishing.value = false
  }
}
</script>
