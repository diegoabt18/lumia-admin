<template>
  <BaseDialog
    v-model:open="open"
    title="Ajustar stock"
    :description="target ? `${target.sku}${target.label ? ` · ${target.label}` : ''}` : undefined"
    size="sm"
    :busy="isSubmitting"
  >
    <form v-if="target" :id="formId" novalidate class="space-y-5" @submit="onSubmit">
      <dl class="grid grid-cols-3 gap-3 rounded-xl bg-lumia-cream/50 p-3 text-center">
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/45">Actual</dt>
          <dd class="font-display text-xl tabular-nums text-lumia-ink">{{ target.quantity }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/45">Reservado</dt>
          <dd class="font-display text-xl tabular-nums text-lumia-ink">{{ target.reserved }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-lumia-ink/45">Disponible</dt>
          <dd class="font-display text-xl tabular-nums text-lumia-ink">{{ previewAvailable }}</dd>
        </div>
      </dl>

      <FormField
        :id="`${formId}-quantity`"
        label="Cantidad total en bodega"
        :error="errors.quantity"
        :hint="`Reemplaza el valor actual. Mínimo ${target.reserved} (unidades reservadas por pedidos).`"
        required
      >
        <template #default="{ id, invalid, describedBy }">
          <BaseInput
            :id="id"
            v-model="quantity"
            v-bind="quantityAttrs"
            inputmode="numeric"
            maxlength="7"
            class="tabular-nums"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting"
          />
        </template>
      </FormField>

      <BaseCheckbox :id="`${formId}-per-order`" v-model="isPerOrder">
        Se fabrica por pedido (se puede vender sin stock)
      </BaseCheckbox>

      <p class="flex items-start gap-2 rounded-xl bg-status-warning-soft/60 px-3 py-2.5 text-[12px] text-status-warning">
        <IconInfoCircle class="mt-px h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
        El valor se guarda tal cual. Si hubo ventas desde que abriste esta ventana, recarga antes de ajustar.
      </p>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">Guardar stock</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { IconInfoCircle } from '@tabler/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { stockFormSchema } from '#shared/schemas/inventory'
import type { StockTarget } from '~/types/ui'

const props = defineProps<{ target: StockTarget | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(stockFormSchema),
})
const [quantity, quantityAttrs] = defineField('quantity', { validateOnModelUpdate: false })
const [isPerOrder] = defineField('isPerOrder')

watch(open, (value) => {
  if (!value || !props.target) return
  formError.value = null
  resetForm({ values: { quantity: String(props.target.quantity), isPerOrder: props.target.isPerOrder } })
})

const previewAvailable = computed(() => {
  const q = Number.parseInt(quantity.value ?? '', 10)
  if (!Number.isFinite(q) || !props.target) return '—'
  return Math.max(0, q - props.target.reserved)
})

const onSubmit = handleSubmit(async (values) => {
  if (!props.target) return
  const next = Number.parseInt(values.quantity, 10)
  // Protección de integridad: bajar de lo reservado dejaría pedidos sin unidades.
  if (next < props.target.reserved) {
    setFieldError('quantity', `No puede ser menor que las ${props.target.reserved} unidades reservadas.`)
    return
  }
  formError.value = null
  try {
    await request(props.target.endpoint, {
      method: 'PUT',
      body: { quantity: next, is_per_order: values.isPerOrder },
    })
    toast.success('Stock actualizado', `${props.target.sku}: ${next} unidades`)
    open.value = false
    emit('saved')
  } catch (error) {
    formError.value = toUiError(error).message
  }
})
</script>
