<template>
  <div>
    <BaseSkeleton v-if="loading" class="h-96 w-full" />
    <ErrorState v-else-if="loadError && !form" :message="loadError.message" @retry="refresh" />
    <form v-else-if="form" novalidate @submit.prevent="save">
      <div class="grid gap-4 lg:grid-cols-2">
        <BaseCard v-for="(method, i) in form.methods" :key="method.methodId">
          <template #header>
            <div class="flex w-full items-start justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-lumia-ink">{{ method.displayName || method.methodId }}</h2>
                <p class="font-mono text-[11px] text-lumia-ink/40">{{ method.methodId }}</p>
              </div>
              <BaseBadge v-if="isLocked(method.methodId)" tone="neutral">Gestionado por el servidor</BaseBadge>
            </div>
          </template>

          <p v-if="isLocked(method.methodId)" class="mb-4 rounded-xl bg-lumia-cream/60 p-3 text-[12px] text-lumia-ink/60">
            Mercado Pago no se activa ni se modifica desde Lumia Admin. Estado actual: <strong>{{ method.isActive ? 'activo' : 'inactivo' }}</strong>.
            La integración además depende de la configuración del servidor.
          </p>
          <div v-else class="space-y-4">
            <BaseSwitch :id="`pay-active-${method.methodId}`" v-model="method.isActive" label="Disponible para los clientes" :disabled="saving" />
            <FormField :id="`pay-name-${method.methodId}`" label="Nombre visible" :error="errors[`methods.${i}.displayName`]" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="method.displayName" maxlength="80" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
              </template>
            </FormField>
            <FormField :id="`pay-desc-${method.methodId}`" label="Descripción" :error="errors[`methods.${i}.description`]">
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="method.description" maxlength="300" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
              </template>
            </FormField>
            <FormField :id="`pay-time-${method.methodId}`" label="Tiempo estimado" :error="errors[`methods.${i}.estimatedProcessingTime`]">
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="method.estimatedProcessingTime" maxlength="60" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
              </template>
            </FormField>
          </div>
        </BaseCard>
      </div>

      <BaseCard class="mt-6" title="Datos para transferencia bancaria" description="Se muestran al cliente cuando paga por transferencia (también en el POS).">
        <p v-if="errors.bankTransferDetails" class="mb-4 text-[13px] text-status-danger" role="alert">{{ errors.bankTransferDetails }}</p>
        <div class="grid gap-5 sm:grid-cols-2">
          <FormField v-for="f in bankFields" :id="`bank-${f.key}`" :key="f.key" :label="f.label" :error="errors[`bankTransferDetails.${f.key}`]" :required="f.required" :class="f.wide && 'sm:col-span-2'">
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="bank[f.key]" :maxlength="f.max" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
        </div>
        <p class="mt-3 text-[12px] text-lumia-ink/50">Deja banco, número y titular vacíos para no publicar datos bancarios (requiere desactivar la transferencia).</p>
      </BaseCard>

      <SettingsFormFooter :dirty="dirty" :saving="saving" :form-error="formError" @discard="discard" />
    </form>
  </div>
</template>

<script setup lang="ts">
import { LOCKED_PAYMENT_METHODS, paymentSettingsSchema, type PaymentMethodId, type PaymentSettings, type PaymentSettingsView } from '#shared/schemas/settings'

type BankForm = { bankName: string; accountNumber: string; accountHolder: string; taxId: string; instructions: string }
type PaymentForm = { methods: PaymentSettings['methods']; bank: BankForm }

const EMPTY_BANK: BankForm = { bankName: '', accountNumber: '', accountHolder: '', taxId: '', instructions: '' }

const { loading, loadError, refresh, form, errors, formError, saving, dirty, save, discard } = useSettingsForm<PaymentSettingsView, PaymentForm>({
  key: 'admin-settings-payments',
  url: '/api/admin/settings/payments',
  method: 'PATCH',
  successMessage: 'Métodos de pago guardados',
  toForm: (v) => ({
    methods: v.methods.map((m) => ({ ...m })),
    bank: { ...EMPTY_BANK, ...(v.bankTransferDetails ?? {}) },
  }),
  build: (f) => {
    const b = f.bank
    const empty = !b.bankName.trim() && !b.accountNumber.trim() && !b.accountHolder.trim() && !b.taxId.trim() && !b.instructions.trim()
    return paymentSettingsSchema.safeParse({ methods: f.methods, bankTransferDetails: empty ? null : b })
  },
})

const bank = computed(() => form.value?.bank ?? { ...EMPTY_BANK })

function isLocked(id: PaymentMethodId) {
  return LOCKED_PAYMENT_METHODS.includes(id)
}

const bankFields: { key: keyof BankForm; label: string; max: number; required?: boolean; wide?: boolean }[] = [
  { key: 'bankName', label: 'Banco', max: 120, required: true },
  { key: 'accountHolder', label: 'Titular', max: 160, required: true },
  { key: 'accountNumber', label: 'Número de cuenta', max: 80, required: true },
  { key: 'taxId', label: 'NIT / documento', max: 40 },
  { key: 'instructions', label: 'Instrucciones', max: 500, wide: true },
]
</script>
