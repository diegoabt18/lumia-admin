<template>
  <div>
    <BaseSkeleton v-if="loading" class="h-80 w-full" />
    <ErrorState v-else-if="loadError && !form" :message="loadError.message" @retry="refresh" />
    <form v-else-if="form" novalidate @submit.prevent="save">
      <div class="grid gap-6 lg:grid-cols-3">
        <BaseCard class="lg:col-span-2" title="Formato de precios" :description="`Moneda: ${view?.code ?? '—'} (no editable: cambiarla no convierte los precios guardados).`">
          <div class="grid gap-5 sm:grid-cols-2">
            <FormField id="cur-name" label="Nombre" :error="errors.name" required>
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.name" maxlength="60" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-symbol" label="Símbolo" :error="errors.symbol" required>
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.symbol" maxlength="5" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-position" label="Posición del símbolo" :error="errors.symbolPosition" required>
              <template #default="{ id, invalid, describedBy }"><BaseSelect :id="id" v-model="form.symbolPosition" :options="positionOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-decimals" label="Decimales" :error="errors.decimalPlaces" required>
              <template #default="{ id, invalid, describedBy }"><BaseSelect :id="id" v-model="decimals" :options="decimalOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-dec-sep" label="Separador decimal" :error="errors.decimalSeparator" required>
              <template #default="{ id, invalid, describedBy }"><BaseSelect :id="id" v-model="form.decimalSeparator" :options="decimalSepOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-thou-sep" label="Separador de miles" :error="errors.thousandsSeparator" required>
              <template #default="{ id, invalid, describedBy }"><BaseSelect :id="id" v-model="form.thousandsSeparator" :options="thousandsOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-prefix" label="Prefijo" :error="errors.prefix">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.prefix" maxlength="10" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cur-suffix" label="Sufijo" :error="errors.suffix">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.suffix" maxlength="10" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <BaseSwitch id="cur-space" v-model="form.spaceBetween" label="Espacio entre símbolo y número" :disabled="saving" />
            <BaseSwitch id="cur-code" v-model="form.showCode" :label="`Mostrar código (${view?.code ?? ''})`" :disabled="saving" />
          </div>
        </BaseCard>

        <BaseCard title="Vista previa" description="Aproximación del formato configurado.">
          <p class="font-display text-4xl tabular-nums text-lumia-ink">{{ preview }}</p>
        </BaseCard>
      </div>
      <SettingsFormFooter :dirty="dirty" :saving="saving" :form-error="formError" @discard="discard" />
    </form>
  </div>
</template>

<script setup lang="ts">
import { currencySettingsSchema, type CurrencySettings, type CurrencySettingsView } from '#shared/schemas/settings'

const { view, loading, loadError, refresh, form, errors, formError, saving, dirty, save, discard } = useSettingsForm<CurrencySettingsView, CurrencySettings>({
  key: 'admin-settings-currency',
  url: '/api/admin/settings/currency',
  method: 'PATCH',
  successMessage: 'Formato de moneda guardado',
  toForm: ({ code: _code, ...rest }) => ({ ...rest }),
  build: (f) => currencySettingsSchema.safeParse(f),
})

const decimals = computed({
  get: () => String(form.value?.decimalPlaces ?? 0),
  set: (v: string) => form.value && (form.value.decimalPlaces = Number(v)),
})

const positionOptions = [
  { value: 'before', label: 'Antes del número ($ 1.000)' },
  { value: 'after', label: 'Después del número (1.000 $)' },
]
const decimalOptions = ['0', '1', '2', '3', '4'].map((v) => ({ value: v, label: v }))
const decimalSepOptions = [
  { value: ',', label: 'Coma (,)' },
  { value: '.', label: 'Punto (.)' },
]
const thousandsOptions = [
  { value: '.', label: 'Punto (.)' },
  { value: ',', label: 'Coma (,)' },
  { value: ' ', label: 'Espacio' },
  { value: '', label: 'Ninguno' },
]

const preview = computed(() => {
  const f = form.value
  if (!f) return ''
  const [int = '0', dec = ''] = (1234567.891).toFixed(f.decimalPlaces).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, f.thousandsSeparator)
  const number = dec ? `${grouped}${f.decimalSeparator}${dec}` : grouped
  const gap = f.spaceBetween ? ' ' : ''
  const body = f.symbolPosition === 'before' ? `${f.symbol}${gap}${number}` : `${number}${gap}${f.symbol}`
  return `${f.prefix}${body}${f.suffix}${f.showCode ? ` ${view.value?.code ?? ''}` : ''}`
})
</script>
