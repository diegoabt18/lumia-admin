<template>
  <BaseDialog
    v-model:open="open"
    :title="variant ? 'Editar variante' : 'Nueva variante'"
    :description="variant ? variant.sku : 'Cada variante es una unidad vendible con su propio SKU, precio y stock.'"
    size="lg"
    :busy="isSubmitting"
  >
    <form :id="formId" novalidate class="space-y-6" @submit="onSubmit">
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField
          :id="`${formId}-sku`"
          label="SKU"
          :error="errors.sku"
          :hint="variant ? 'El SKU no se puede cambiar.' : 'Código interno único. No se podrá cambiar después.'"
          required
        >
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="sku" maxlength="80" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting || Boolean(variant)" />
          </template>
        </FormField>

        <FormField :id="`${formId}-barcode`" label="Código de barras" :error="errors.barcode" hint="Opcional. Lo usa el POS para escanear.">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="barcode" maxlength="64" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
          </template>
        </FormField>

        <FormField :id="`${formId}-price`" :label="`Precio de venta (${currency})`" :error="errors.price" hint="IVA incluido." required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="price" inputmode="decimal" maxlength="13" class="tabular-nums" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
          </template>
        </FormField>

        <FormField :id="`${formId}-compare`" :label="`Precio antes (${currency})`" :error="errors.compareAtPrice" hint="Opcional. Se muestra tachado; debe ser mayor que el precio.">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="compareAtPrice" inputmode="decimal" maxlength="13" class="tabular-nums" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
          </template>
        </FormField>
      </div>

      <fieldset class="space-y-3">
        <legend class="text-[13px] font-medium text-lumia-ink">Opciones</legend>
        <p class="text-[12px] text-lumia-ink/50">
          {{ axes.length ? 'Valores definidos para este producto.' : 'Ej. Tamaño = 200 g, Aroma = Lavanda. Máximo 3.' }}
        </p>

        <div v-for="(row, i) in optionRows" :key="i" class="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
          <div>
            <label :for="`${formId}-opt-name-${i}`" class="sr-only">Nombre de la opción {{ i + 1 }}</label>
            <BaseInput
              :id="`${formId}-opt-name-${i}`"
              :model-value="row.name"
              placeholder="Nombre"
              maxlength="120"
              :invalid="Boolean(optionError(i, 'name'))"
              :disabled="isSubmitting || axes.length > 0"
              @update:model-value="(v) => setOption(i, 'name', v)"
            />
            <p v-if="optionError(i, 'name')" class="mt-1 text-[12px] text-status-danger" role="alert">{{ optionError(i, 'name') }}</p>
          </div>
          <div>
            <label :for="`${formId}-opt-value-${i}`" class="sr-only">Valor de {{ row.name || `la opción ${i + 1}` }}</label>
            <BaseSelect
              v-if="axes[i]"
              :id="`${formId}-opt-value-${i}`"
              :model-value="row.value"
              :options="axisOptions(i, row.value)"
              placeholder="Sin valor"
              :invalid="Boolean(optionError(i, 'value'))"
              :disabled="isSubmitting"
              @update:model-value="(v) => setOption(i, 'value', v)"
            />
            <BaseInput
              v-else
              :id="`${formId}-opt-value-${i}`"
              :model-value="row.value"
              placeholder="Valor"
              maxlength="200"
              :invalid="Boolean(optionError(i, 'value'))"
              :disabled="isSubmitting"
              @update:model-value="(v) => setOption(i, 'value', v)"
            />
            <p v-if="optionError(i, 'value')" class="mt-1 text-[12px] text-status-danger" role="alert">{{ optionError(i, 'value') }}</p>
          </div>
          <BaseButton v-if="!axes.length" variant="ghost" size="sm" :disabled="isSubmitting" @click="removeOption(i)">
            <template #icon><IconX class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            <span class="sr-only">Quitar opción {{ i + 1 }}</span>
          </BaseButton>
        </div>

        <BaseButton v-if="!axes.length && optionRows.length < 3" variant="ghost" size="sm" :disabled="isSubmitting" @click="addOption">
          <template #icon><IconPlus class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Agregar opción
        </BaseButton>
      </fieldset>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">{{ variant ? 'Guardar cambios' : 'Crear variante' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { IconPlus, IconX } from '@tabler/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import type { VariantRow } from '#shared/schemas/products'
import {
  optionsFromRows,
  variantFormSchema,
  type OptionAxis,
  type VariantCreateBody,
  type VariantFormValues,
  type VariantPatchBody,
} from '#shared/schemas/variants'

const props = defineProps<{ productId: string; variant: VariantRow | null; axes: OptionAxis[] }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const currency = useRuntimeConfig().public.storeCurrency

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors, setFieldError, values, setFieldValue } = useForm({
  validationSchema: toTypedSchema(variantFormSchema),
})
const [sku] = defineField('sku', { validateOnModelUpdate: false })
const [barcode] = defineField('barcode', { validateOnModelUpdate: false })
const [price] = defineField('price', { validateOnModelUpdate: false })
const [compareAtPrice] = defineField('compareAtPrice', { validateOnModelUpdate: false })

type OptionRow = VariantFormValues['options'][number]
const optionRows = computed<OptionRow[]>(() => values.options ?? [])

function initialOptions(): OptionRow[] {
  const current = props.variant?.options ?? {}
  if (props.axes.length) return props.axes.map((axis) => ({ name: axis.name, value: current[axis.name] ?? '' }))
  return Object.entries(current).map(([name, value]) => ({ name, value }))
}

watch(open, (value) => {
  if (!value) return
  formError.value = null
  const v = props.variant
  resetForm({
    values: {
      sku: v?.sku ?? '',
      barcode: v?.barcode ?? '',
      price: v ? String(v.price) : '',
      compareAtPrice: v?.compareAtPrice ? String(v.compareAtPrice) : '',
      options: initialOptions(),
    },
  })
})

function setOption(index: number, key: 'name' | 'value', value: string) {
  setFieldValue('options', optionRows.value.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
}
function addOption() {
  setFieldValue('options', [...optionRows.value, { name: '', value: '' }])
}
function removeOption(index: number) {
  setFieldValue('options', optionRows.value.filter((_, i) => i !== index))
}

function optionError(index: number, key: 'name' | 'value'): string | undefined {
  return (errors.value as Record<string, string | undefined>)[`options[${index}].${key}`]
}

/** Valores del eje; conserva el valor actual aunque ya no esté definido en el eje. */
function axisOptions(index: number, current: string) {
  const values = props.axes[index]?.values ?? []
  const list = values.map((v) => {
    const val = typeof v === 'string' ? v : v.value
    return { value: val, label: val }
  })
  if (current && !list.some((o) => o.value === current)) list.unshift({ value: current, label: `${current} (actual)` })
  return list
}

function sameOptions(a: Record<string, string>, b: Record<string, string>) {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

function buildPatch(v: VariantFormValues, current: VariantRow): VariantPatchBody | null {
  const patch: Record<string, unknown> = {}
  if (v.barcode !== (current.barcode ?? '')) patch.barcode = v.barcode || null
  if (Number(v.price) !== current.price) patch.price = Number(v.price)
  const compare = v.compareAtPrice === '' ? null : Number(v.compareAtPrice)
  if (compare !== current.compareAtPrice) patch.compare_at_price = compare
  const options = optionsFromRows(v.options)
  if (!sameOptions(options, current.options)) patch.options = options
  return Object.keys(patch).length ? (patch as VariantPatchBody) : null
}

const onSubmit = handleSubmit(async (v) => {
  formError.value = null
  try {
    if (props.variant) {
      const patch = buildPatch(v, props.variant)
      if (!patch) {
        open.value = false
        return
      }
      await request(`/api/admin/products/${props.productId}/variants/${encodeURIComponent(props.variant.sku)}`, {
        method: 'PATCH',
        body: patch,
      })
      toast.success('Variante actualizada', props.variant.sku)
    } else {
      const options = optionsFromRows(v.options)
      const body: VariantCreateBody = {
        sku: v.sku,
        price: Number(v.price),
        ...(v.barcode ? { barcode: v.barcode } : {}),
        ...(v.compareAtPrice ? { compare_at_price: Number(v.compareAtPrice) } : {}),
        ...(Object.keys(options).length ? { options } : {}),
      }
      await request(`/api/admin/products/${props.productId}/variants`, { method: 'POST', body })
      toast.success('Variante creada', `${v.sku}. Recuerda cargar su stock.`)
    }
    open.value = false
    emit('saved')
  } catch (error) {
    const ui = toUiError(error)
    if (ui.status === 409 && /barras/i.test(ui.message)) setFieldError('barcode', ui.message)
    else if (ui.status === 409) setFieldError('sku', ui.message)
    else {
      const fieldMap: Record<string, string> = { compare_at_price: 'compareAtPrice' }
      const mapped = Object.fromEntries(
        Object.entries(ui.fieldErrors).map(([k, msgs]) => [fieldMap[k] ?? k, msgs[0] ?? '']),
      )
      if (Object.keys(mapped).length) setErrors(mapped)
      formError.value = ui.message
    }
  }
})
</script>
