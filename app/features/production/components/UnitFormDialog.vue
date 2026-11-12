<template>
  <BaseDialog v-model:open="open" :title="unit ? `Editar ${unit.name}` : 'Nueva unidad'" :busy="saving">
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="save">
      <FormField :id="`${formId}-name`" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.name" maxlength="100" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>

      <template v-if="!unit">
        <div class="grid gap-5 sm:grid-cols-2">
          <FormField :id="`${formId}-abbr`" label="Abreviatura" :error="errors.abbreviation" hint="Única. No se podrá cambiar." required>
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="form.abbreviation" maxlength="20" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
          <FormField :id="`${formId}-family`" label="Familia" :error="errors.family" required>
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="form.family" :options="familyOptions" :disabled="saving" />
            </template>
          </FormField>
        </div>
        <FormField
          :id="`${formId}-factor`"
          label="Factor respecto a la unidad base"
          :error="errors.baseFactor"
          hint="Cuántas unidades base equivale (base: kg, l, m, m² o unidad). Ej.: gramo = 0,001. No se podrá cambiar."
          required
        >
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.baseFactor" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </template>
      <dl v-else class="grid grid-cols-3 gap-3 rounded-xl bg-lumia-cream/60 p-3 text-[13px]">
        <div><dt class="text-[11px] text-lumia-ink/50">Abreviatura</dt><dd class="font-mono">{{ unit.abbreviation }}</dd></div>
        <div><dt class="text-[11px] text-lumia-ink/50">Familia</dt><dd>{{ UNIT_FAMILY_LABELS[unit.family] }}</dd></div>
        <div><dt class="text-[11px] text-lumia-ink/50">Factor</dt><dd class="tabular-nums">{{ unit.baseFactor }}</dd></div>
      </dl>

      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-order`" label="Orden" :error="errors.sortOrder">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.sortOrder" type="number" step="1" min="0" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <div v-if="unit" class="flex items-end pb-2">
          <BaseSwitch :id="`${formId}-active`" v-model="form.active" label="Activa" :disabled="saving" />
        </div>
      </div>
      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">{{ unit ? 'Guardar cambios' : 'Crear unidad' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { UNIT_FAMILIES, UNIT_FAMILY_LABELS, unitCreateBodySchema, unitPatchBodySchema, type UnitFamily, type UnitRow } from '#shared/schemas/production'

const props = defineProps<{ unit: UnitRow | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const form = reactive({ name: '', abbreviation: '', family: 'mass' as UnitFamily, baseFactor: '', sortOrder: '', active: true })
const familyOptions = UNIT_FAMILIES.map((f) => ({ value: f, label: UNIT_FAMILY_LABELS[f] }))

watch(open, (value) => {
  if (!value) return
  const u = props.unit
  Object.assign(form, {
    name: u?.name ?? '',
    abbreviation: '',
    family: 'mass',
    baseFactor: '',
    sortOrder: u ? String(u.sortOrder) : '',
    active: u?.active ?? true,
  })
  errors.value = {}
  formError.value = null
})

// v-model en input type="number" entrega number; String() cubre ambos casos.
const toNumber = (v: string | number) => {
  const text = String(v).trim()
  return text === '' ? undefined : Number(text)
}

async function save() {
  if (saving.value) return
  errors.value = {}
  formError.value = null
  const u = props.unit
  let body: Record<string, unknown>
  if (u) {
    const patch: Record<string, unknown> = {}
    if (form.name.trim() !== u.name) patch.name = form.name
    if (form.active !== u.active) patch.active = form.active
    const order = toNumber(form.sortOrder)
    if (order !== undefined && order !== u.sortOrder) patch.sortOrder = order
    if (!Object.keys(patch).length) {
      open.value = false
      return
    }
    const parsed = unitPatchBodySchema.safeParse(patch)
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      return
    }
    body = parsed.data
  } else {
    const parsed = unitCreateBodySchema.safeParse({
      name: form.name,
      abbreviation: form.abbreviation,
      family: form.family,
      baseFactor: toNumber(form.baseFactor),
      sortOrder: toNumber(form.sortOrder),
    })
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      return
    }
    body = parsed.data
  }

  saving.value = true
  try {
    await request(u ? `/api/admin/production/units/${u.id}` : '/api/admin/production/units', { method: u ? 'PATCH' : 'POST', body })
    toast.success(u ? 'Unidad actualizada' : 'Unidad creada')
    open.value = false
    emit('saved')
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    if (ui.status === 409) errors.value = { ...errors.value, abbreviation: ui.message }
    else formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
