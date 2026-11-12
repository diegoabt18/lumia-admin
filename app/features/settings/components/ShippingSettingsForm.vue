<template>
  <div>
    <BaseSkeleton v-if="loading" class="h-96 w-full" />
    <ErrorState v-else-if="loadError && !form" :message="loadError.message" @retry="refresh" />
    <form v-else-if="form" novalidate @submit.prevent="save">
      <div class="grid gap-6 lg:grid-cols-2">
        <BaseCard title="Envío">
          <div class="space-y-5">
            <BaseSwitch id="ship-enabled" v-model="form.shippingEnabled" label="Cobrar envío" description="Desactivado: el envío no tiene costo en ningún pedido." :disabled="saving" />
            <BaseSwitch id="ship-flat" v-model="form.flatRateEnabled" label="Tarifa fija" description="Desactivada: el costo lo coordina el vendedor con el cliente (envío variable)." :disabled="saving || !form.shippingEnabled" />
            <FormField id="ship-flat-rate" :label="`Tarifa fija (${currency})`" :error="errors.flatRate" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="flatRate" inputmode="numeric" maxlength="10" class="tabular-nums" :invalid="invalid" :described-by="describedBy" :disabled="saving || !form.shippingEnabled || !form.flatRateEnabled" />
              </template>
            </FormField>
          </div>
        </BaseCard>

        <BaseCard title="Envío gratis">
          <div class="space-y-5">
            <BaseSwitch id="ship-free" v-model="form.freeShippingEnabled" label="Envío gratis desde un monto" :disabled="saving || !form.shippingEnabled" />
            <FormField id="ship-threshold" :label="`Monto mínimo (${currency})`" :error="errors.freeShippingThreshold" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="threshold" inputmode="numeric" maxlength="10" class="tabular-nums" :invalid="invalid" :described-by="describedBy" :disabled="saving || !form.freeShippingEnabled" />
              </template>
            </FormField>
            <FormField id="ship-apply" label="Se compara con" :error="errors.applyThresholdOn" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseSelect :id="id" v-model="form.applyThresholdOn" :options="thresholdOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving || !form.freeShippingEnabled" />
              </template>
            </FormField>
          </div>
        </BaseCard>
      </div>

      <BaseCard class="mt-6" title="Mensajes en la tienda" description="Variables disponibles: {remaining} (lo que falta) y {shippingCost} (costo del envío).">
        <div class="mb-5 grid gap-4 sm:grid-cols-2">
          <BaseSwitch id="ship-progress" v-model="form.showProgressBar" label="Barra de progreso" :disabled="saving" />
          <BaseSwitch id="ship-messages" v-model="form.showMessages" label="Mostrar mensajes" :disabled="saving" />
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <FormField v-for="m in messageFields" :id="`ship-msg-${m.key}`" :key="m.key" :label="m.label" :error="errors[`messages.${m.key}`]">
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="form.messages[m.key]" maxlength="300" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
        </div>
      </BaseCard>

      <SettingsFormFooter :dirty="dirty" :saving="saving" :form-error="formError" @discard="discard">
        <template #extra>
          <BaseButton variant="ghost" :disabled="saving || resetting" :loading="resetting" @click="resetDefaults">Valores por defecto</BaseButton>
        </template>
      </SettingsFormFooter>
    </form>
  </div>
</template>

<script setup lang="ts">
import { SHIPPING_MESSAGE_KEYS, shippingSettingsSchema, type ShippingSettings } from '#shared/schemas/settings'

type ShippingForm = Omit<ShippingSettings, 'flatRate' | 'freeShippingThreshold'> & { flatRate: string; freeShippingThreshold: string }

const currency = useRuntimeConfig().public.storeCurrency
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const toInt = (v: string) => (/^\d{1,10}$/.test(v.trim()) ? Number(v.trim()) : Number.NaN)

const { view, loading, loadError, refresh, form, errors, formError, saving, dirty, save, discard } = useSettingsForm<ShippingSettings, ShippingForm>({
  key: 'admin-settings-shipping',
  url: '/api/admin/settings/shipping',
  method: 'PUT',
  successMessage: 'Configuración de envíos guardada',
  toForm: (v) => ({ ...v, messages: { ...v.messages }, flatRate: String(v.flatRate), freeShippingThreshold: String(v.freeShippingThreshold) }),
  build: (f) => shippingSettingsSchema.safeParse({ ...f, flatRate: toInt(f.flatRate), freeShippingThreshold: toInt(f.freeShippingThreshold) }),
})

// Inputs numéricos editados como texto (v-model sobre propiedades del formulario).
const flatRate = computed({ get: () => form.value?.flatRate ?? '', set: (v: string) => form.value && (form.value.flatRate = v) })
const threshold = computed({ get: () => form.value?.freeShippingThreshold ?? '', set: (v: string) => form.value && (form.value.freeShippingThreshold = v) })

const thresholdOptions = [
  { value: 'subtotal', label: 'Subtotal de productos' },
  { value: 'total_before_taxes', label: 'Total antes de impuestos' },
  { value: 'total_final', label: 'Total final' },
]

const MESSAGE_LABELS: Record<(typeof SHIPPING_MESSAGE_KEYS)[number], string> = {
  remainingMessage: 'Falta para envío gratis',
  freeShippingMessage: 'Envío gratis alcanzado',
  shippingCostMessage: 'Costo del envío',
  variableShippingMessage: 'Envío variable',
  progressBarMessage: 'Barra: falta',
  progressBarCompleteMessage: 'Barra: completada',
}
const messageFields = SHIPPING_MESSAGE_KEYS.map((key) => ({ key, label: MESSAGE_LABELS[key] }))

const resetting = ref(false)
async function resetDefaults() {
  const ok = await confirm({
    title: 'Restablecer envíos',
    description: 'Se reemplaza toda la configuración de envíos por los valores por defecto del servidor.',
    confirmLabel: 'Restablecer',
    tone: 'danger',
  })
  if (!ok) return
  resetting.value = true
  try {
    view.value = await request<ShippingSettings>('/api/admin/settings/shipping-reset', { method: 'POST' })
    toast.success('Envíos restablecidos')
  } catch (e) {
    toast.error('No se pudo restablecer', toUiError(e).message)
  } finally {
    resetting.value = false
  }
}
</script>
