<template>
  <BaseDialog v-model:open="open" title="Registrar precio" :description="`${material.name} · por ${material.purchaseUnit}`" :busy="saving">
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="save">
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-price`" label="Precio total pagado" :error="errors.price" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.price" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-qty`" :label="`Cantidad comprada (${material.purchaseUnit})`" :error="errors.quantity" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.quantity" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </div>
      <FormField v-if="material.purchaseUnit === 'rollo'" :id="`${formId}-roll`" label="Metros por rollo" :error="errors.rolloMeters" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.rolloMeters" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>

      <p class="rounded-xl bg-lumia-cream/60 p-3 text-[13px] text-lumia-ink/75" aria-live="polite">
        Nuevo costo: <strong class="tabular-nums text-lumia-ink">{{ unitCost !== null ? formatUnitCost(unitCost) : '—' }}</strong> por {{ material.purchaseUnit }}
        <template v-if="material.lastCost > 0 && unitCost !== null"> · antes {{ formatUnitCost(material.lastCost) }}<template v-if="change !== null"> ({{ change > 0 ? '+' : '' }}{{ change }} %)</template></template>
      </p>

      <FormField :id="`${formId}-supplier`" label="Proveedor" :error="errors.supplierId" :hint="material.suppliers.length ? undefined : 'Vincula proveedores al material para elegirlos aquí.'">
        <template #default="{ id, invalid, describedBy }">
          <BaseSelect :id="id" v-model="form.supplierId" :options="supplierOptions" placeholder="Sin proveedor" :invalid="invalid" :described-by="describedBy" :disabled="saving || !material.suppliers.length" />
        </template>
      </FormField>
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-invoice`" label="N.º de factura" :error="errors.invoiceNumber">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.invoiceNumber" maxlength="100" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-notes`" label="Notas" :error="errors.notes">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.notes" maxlength="500" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </div>
      <p class="text-[12px] text-lumia-ink/55">Al guardar, el servidor actualiza el costo del material y marca como desactualizadas las recetas que lo usan.</p>
      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">Registrar precio</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { priceEntryBodySchema, type MaterialDetail, type PriceEntry } from '#shared/schemas/production'

const props = defineProps<{ material: MaterialDetail }>()
const emit = defineEmits<{ saved: [value: { material: MaterialDetail; prices: PriceEntry[] }] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const form = reactive({ price: '', quantity: '1', rolloMeters: '', supplierId: '', invoiceNumber: '', notes: '' })

const supplierOptions = computed(() =>
  props.material.suppliers.map((s) => ({ value: s.supplierId, label: `${s.supplierName || s.supplierId}${s.isPreferred ? ' (preferido)' : ''}` })),
)

watch(open, (value) => {
  if (!value) return
  const preferred = props.material.suppliers.find((s) => s.isPreferred)
  Object.assign(form, { price: '', quantity: '1', rolloMeters: props.material.rollMeters ? String(props.material.rollMeters) : '', supplierId: preferred?.supplierId ?? '', invoiceNumber: '', notes: '' })
  errors.value = {}
  formError.value = null
})

// v-model en input type="number" entrega number; String() cubre ambos casos.
const num = (v: string | number) => {
  const text = String(v).trim()
  return text === '' ? undefined : Number(text.replace(',', '.'))
}
/** Mismo cálculo que el Server (calculateUnitCost): precio ÷ cantidad. */
const unitCost = computed(() => {
  const price = num(form.price)
  const qty = num(form.quantity)
  return price && qty && price > 0 && qty > 0 ? price / qty : null
})
const change = computed(() =>
  unitCost.value !== null && props.material.lastCost > 0
    ? Math.round(((unitCost.value - props.material.lastCost) / props.material.lastCost) * 100)
    : null,
)

async function save() {
  if (saving.value) return
  errors.value = {}
  formError.value = null
  const parsed = priceEntryBodySchema.safeParse({
    price: num(form.price),
    quantity: num(form.quantity),
    rolloMeters: props.material.purchaseUnit === 'rollo' ? num(form.rolloMeters) : undefined,
    supplierId: form.supplierId || undefined,
    invoiceNumber: form.invoiceNumber.trim() || undefined,
    notes: form.notes.trim() || undefined,
  })
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error)
    return
  }
  saving.value = true
  try {
    const result = await request<{ material: MaterialDetail; prices: PriceEntry[] }>(
      `/api/admin/production/materials/${props.material.id}/prices`,
      { method: 'POST', body: parsed.data },
    )
    toast.success('Precio registrado')
    open.value = false
    emit('saved', result)
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
