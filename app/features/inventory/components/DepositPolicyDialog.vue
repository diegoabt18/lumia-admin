<template>
  <BaseDialog
    v-model:open="open"
    title="Política de anticipo"
    :description="target ? `${target.sku}${target.label ? ` · ${target.label}` : ''}` : undefined"
    size="md"
    :busy="saving"
  >
    <div v-if="target" class="space-y-6">
      <p
        v-if="!target.isPerOrder"
        class="flex items-start gap-2 rounded-xl bg-status-info-soft/60 px-3 py-2.5 text-[12px] text-status-info"
      >
        <IconInfoCircle class="mt-px h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
        Este SKU es de stock: se cobra el 100 % y la política no se aplica. Márcalo como “por pedido” en Ajustar stock para usarla.
      </p>

      <div v-if="loadError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        No se pudo cargar la política vigente: {{ loadError }}. Recarga antes de guardar para no sobrescribir cambios ajenos.
      </div>
      <p v-else-if="loading" class="text-[13px] text-lumia-ink/55">Cargando política vigente…</p>

      <section v-else class="rounded-xl bg-lumia-cream/50 p-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-lumia-ink/45">Vigente</p>
        <p class="mt-1 text-sm text-lumia-ink">{{ describePolicy(current) }}</p>
        <p v-if="current?.authorization" class="mt-1 text-[12px] text-lumia-ink/55">
          Autorizada por {{ current.authorization.authorizedBy ? `usuario ${current.authorization.authorizedBy.slice(-6)}` : 'sistema' }}
          · {{ current.authorization.reason }}
        </p>
      </section>

      <form v-if="!loading && !loadError" :id="formId" novalidate class="space-y-5" @submit.prevent="submit">
        <FormField :id="`${formId}-type`" label="Modalidad de anticipo" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="type" :options="TYPE_OPTIONS" :disabled="saving" />
          </template>
        </FormField>

        <details class="rounded-xl border border-lumia-ink/8 bg-white px-4 py-3 text-[13px] text-lumia-ink/75">
          <summary class="cursor-pointer font-medium text-lumia-ink">¿Qué modalidad elegir?</summary>
          <ul class="mt-3 space-y-3">
            <li v-for="item in TYPE_GUIDE" :key="item.value" :class="item.value === type ? 'rounded-lg bg-lumia-cream/60 p-2 -mx-2' : ''">
              <p class="font-medium text-lumia-ink">{{ item.title }}</p>
              <p>{{ item.help }}</p>
              <p class="text-[12px] text-lumia-ink/55">Ejemplo: {{ item.example }}</p>
            </li>
          </ul>
        </details>

        <template v-if="type !== 'none'">
          <FormField :id="`${formId}-value`" :label="valueLabel" :hint="valueHint" :error="errors.value" required>
            <template #default="{ id, invalid, describedBy }">
              <BaseInput
                :id="id"
                v-model="value"
                inputmode="decimal"
                class="tabular-nums"
                :invalid="invalid"
                :described-by="describedBy"
                :disabled="saving"
              />
            </template>
          </FormField>

          <p v-if="example" class="rounded-xl border border-lumia-ink/8 bg-white px-4 py-3 text-[13px] text-lumia-ink/75">
            <span class="font-medium text-lumia-ink">Ejemplo:</span> {{ example }}
          </p>

          <FormField
            v-if="type === 'custom_authorized'"
            :id="`${formId}-reason`"
            label="Motivo de la excepción"
            hint="Quedará registrado junto con tu usuario y la fecha."
            :error="errors.reason"
            required
          >
            <template #default="{ id, invalid, describedBy }">
              <BaseTextarea :id="id" v-model="reason" :rows="2" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
        </template>

        <p class="text-[12px] leading-relaxed text-lumia-ink/55">
          <span class="font-medium text-lumia-ink/75">Al guardar:</span>
          el cambio aplica solo a pedidos nuevos. Los pedidos ya creados conservan la política con la que se vendieron.
          <template v-if="type === 'none'">
            Sin política, los pedidos de este SKU <span class="font-medium">no se podrán crear</span> hasta configurarla.
          </template>
        </p>

        <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
          {{ formError }}
        </p>
      </form>

      <section v-if="!loadError && history.length" class="border-t border-lumia-ink/8 pt-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-lumia-ink/45">Historial de cambios</p>
        <ol class="mt-3 space-y-3">
          <li v-for="entry in history" :key="entry.id" class="text-[13px]">
            <p class="text-lumia-ink">{{ entry.description }}</p>
            <p class="text-[12px] text-lumia-ink/55">
              {{ formatDateTime(entry.createdAt) }} · usuario {{ entry.performedBy.slice(-6) || '—' }}
              · antes: {{ describePolicy(entry.previousValue) }} → ahora: {{ describePolicy(entry.newValue) }}
            </p>
          </li>
        </ol>
      </section>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton
        type="submit"
        :form="formId"
        :loading="saving"
        :disabled="loading || !!loadError"
      >
        Guardar política
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { IconInfoCircle } from '@tabler/icons-vue'
import {
  depositPolicyBodySchema,
  DEPOSIT_POLICY_LABELS,
  type DepositPolicyBody,
  type DepositPolicyType,
  type DepositPolicyView,
  type DepositPolicyHistory,
} from '#shared/schemas/inventory'
import type { DepositPolicyTarget } from '~/types/ui'

const props = defineProps<{ target: DepositPolicyTarget | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()

const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const errors = reactive<Record<string, string | undefined>>({})

const current = ref<DepositPolicyView | null>(null)
const version = ref(0)
const history = ref<DepositPolicyHistory['items']>([])

/** Guía en lenguaje de negocio para elegir la modalidad (se muestra junto al selector). */
const TYPE_GUIDE: Array<{ value: 'none' | DepositPolicyType; title: string; help: string; example: string }> = [
  {
    value: 'none',
    title: 'Sin política',
    help: 'El producto no tiene anticipo. Mientras no tenga política, los pedidos de este SKU no se pueden crear.',
    example: 'no aplica; configura una modalidad para poder vender.',
  },
  {
    value: 'fixed',
    title: 'Importe fijo por unidad',
    help: 'Se cobra siempre el mismo importe por cada unidad vendida, sin importar el precio del producto.',
    example: '$350.000 por unidad; 2 unidades = $700.000 de anticipo.',
  },
  {
    value: 'percent',
    title: 'Porcentaje del total de la línea',
    help: 'Se cobra un porcentaje del precio total del producto en el pedido. Es lo más habitual para fabricaciones con precio fijo.',
    example: '35 % de $1.000.000 = $350.000 de anticipo.',
  },
  {
    value: 'materials',
    title: 'Porcentaje del costo de materiales',
    help: 'Se cobra un porcentaje del costo de materiales de la hoja de costo de producción del SKU. Requiere que el SKU tenga hoja de costo; si no la tiene, el pedido se bloquea.',
    example: '50 % de $200.000 de materiales = $100.000 de anticipo.',
  },
  {
    value: 'custom_authorized',
    title: 'Importe personalizado autorizado',
    help: 'Un importe por unidad que defines a mano para un caso especial. Queda registrado quién lo guardó, cuándo y el motivo.',
    example: '$120.000 por unidad, por acuerdo con un cliente corporativo (motivo obligatorio).',
  },
]

const TYPE_OPTIONS = [
  { value: 'none', label: 'Sin política (no se puede vender por pedido)' },
  ...(Object.keys(DEPOSIT_POLICY_LABELS) as DepositPolicyType[]).map((t) => ({ value: t, label: DEPOSIT_POLICY_LABELS[t] })),
]

const type = ref<'none' | DepositPolicyType>('none')
const value = ref('')
const reason = ref('')

const valueLabel = computed(() => {
  if (type.value === 'percent' || type.value === 'materials') return 'Porcentaje (0 – 100)'
  return 'Importe por unidad (COP)'
})
const valueHint = computed(() => {
  if (type.value === 'fixed') return 'Anticipo por cada unidad vendida.'
  if (type.value === 'custom_authorized') return 'Importe por unidad, fijado por excepción.'
  if (type.value === 'materials') return 'Porcentaje del costo de materiales de la hoja de costo del SKU.'
  if (type.value === 'percent') return 'Porcentaje sobre el total de la línea.'
  return undefined
})

/** Traduce la política a una cifra concreta, para que se vea qué representa el anticipo. */
const example = computed(() => {
  const n = Number(value.value.replace(',', '.'))
  if (!value.value.trim() || !Number.isFinite(n) || n <= 0) return null
  const sample = 1_000_000
  if (type.value === 'percent') {
    return `en una línea de ${formatCurrency(sample)}, el anticipo es ${formatCurrency((sample * n) / 100)}.`
  }
  if (type.value === 'fixed' || type.value === 'custom_authorized') {
    return `cada unidad exige ${formatCurrency(n)} de anticipo; 3 unidades, ${formatCurrency(n * 3)}.`
  }
  if (type.value === 'materials') {
    return `si los materiales cuestan ${formatCurrency(sample)} por unidad, el anticipo es ${formatCurrency((sample * n) / 100)}.`
  }
  return null
})

function describePolicy(policy: DepositPolicyView | null | undefined): string {
  if (!policy) return 'Sin política'
  if (policy.type === 'percent') return `${policy.value}% del total de la línea`
  if (policy.type === 'materials') return `${policy.value}% del costo de materiales`
  if (policy.type === 'fixed') return `${formatCurrency(policy.value)} por unidad`
  return `${formatCurrency(policy.value)} por unidad (personalizado)`
}

function formatDateTime(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

async function loadPolicy(sku: string) {
  loading.value = true
  loadError.value = null
  try {
    const data = await request<DepositPolicyHistory>(
      `/api/admin/inventory/${encodeURIComponent(sku)}/deposit-policy/history`,
    )
    current.value = data.current
    version.value = data.version
    history.value = data.items
    // El formulario parte de la política que Server devuelve, nunca de datos de listado.
    type.value = data.current?.type ?? 'none'
    value.value = data.current ? String(data.current.value) : ''
    reason.value = data.current?.authorization?.reason ?? ''
  } catch (error) {
    loadError.value = toUiError(error).message
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen || !props.target) return
  formError.value = null
  clearErrors()
  void loadPolicy(props.target.sku)
})

function clearErrors() {
  for (const key of Object.keys(errors)) errors[key] = undefined
}

function buildBody(): DepositPolicyBody {
  if (type.value === 'none') return { expected_version: version.value, deposit_policy: null }
  return {
    expected_version: version.value,
    deposit_policy: {
      type: type.value,
      value: Number(value.value.replace(',', '.')),
      ...(type.value === 'custom_authorized' ? { authorization: { reason: reason.value.trim() } } : {}),
    },
  }
}

async function submit() {
  if (!props.target || loading.value || loadError.value) return
  clearErrors()
  formError.value = null
  if (type.value !== 'none' && value.value.trim() === '') {
    errors.value = 'Ingresa un valor.'
    return
  }
  const parsed = depositPolicyBodySchema.safeParse(buildBody())
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path.at(-1) ?? '')
      if (field === 'value' || field === 'reason') errors[field] = issue.message
      else formError.value = issue.message
    }
    if (!formError.value && Object.values(errors).every((m) => !m)) formError.value = 'Revisa la política de anticipo.'
    return
  }
  if (parsed.data.deposit_policy && (type.value === 'percent' || type.value === 'materials') && parsed.data.deposit_policy.value > 100) {
    errors.value = 'El porcentaje no puede superar 100.'
    return
  }

  saving.value = true
  try {
    await request(`/api/admin/inventory/${encodeURIComponent(props.target.sku)}/deposit-policy`, {
      method: 'PUT',
      body: parsed.data,
    })
    toast.success('Política guardada', props.target.sku)
    open.value = false
    emit('saved')
  } catch (error) {
    formError.value = toUiError(error).message
    // Tras un conflicto o error, recarga la versión vigente para que el siguiente intento sea válido.
    void loadPolicy(props.target.sku)
  } finally {
    saving.value = false
  }
}
</script>
