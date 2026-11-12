<template>
  <BaseDialog v-model:open="open" :title="supplier ? 'Editar proveedor' : 'Nuevo proveedor'" :description="supplier?.name" :busy="saving">
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="save">
      <FormField :id="`${formId}-name`" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.name" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-contact`" label="Contacto" :error="errors.contactName">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.contactName" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-phone`" label="Teléfono" :error="errors.phone">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.phone" type="tel" maxlength="50" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </div>
      <FormField :id="`${formId}-email`" label="Correo" :error="errors.email">
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.email" type="email" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>
      <FormField :id="`${formId}-notes`" label="Notas" :error="errors.notes">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea :id="id" v-model="form.notes" :rows="3" maxlength="1000" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>
      <div class="flex flex-col gap-3">
        <BaseSwitch :id="`${formId}-fav`" v-model="form.isFavorite" label="Favorito" description="Aparece primero al elegir proveedores." :disabled="saving" />
        <BaseSwitch :id="`${formId}-active`" v-model="form.active" label="Activo" description="Los inactivos no se pueden vincular a materiales." :disabled="saving" />
      </div>
      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">{{ supplier ? 'Guardar cambios' : 'Crear proveedor' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { supplierCreateBodySchema, supplierPatchBodySchema, type SupplierRow } from '#shared/schemas/production'

const props = defineProps<{ supplier: SupplierRow | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const form = reactive({ name: '', contactName: '', phone: '', email: '', notes: '', isFavorite: false, active: true })

watch(open, (value) => {
  if (!value) return
  const s = props.supplier
  Object.assign(form, {
    name: s?.name ?? '',
    contactName: s?.contactName ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    notes: s?.notes ?? '',
    isFavorite: s?.isFavorite ?? false,
    active: s?.active ?? true,
  })
  errors.value = {}
  formError.value = null
})

async function save() {
  if (saving.value) return
  errors.value = {}
  formError.value = null
  const s = props.supplier
  let body: Record<string, unknown>
  if (s) {
    const patch: Record<string, unknown> = {}
    const current = { name: s.name, contactName: s.contactName ?? '', phone: s.phone ?? '', email: s.email ?? '', notes: s.notes ?? '', isFavorite: s.isFavorite, active: s.active }
    for (const key of Object.keys(current) as (keyof typeof current)[]) {
      const value = typeof form[key] === 'string' ? (form[key] as string).trim() : form[key]
      if (value !== current[key]) patch[key] = value
    }
    if (!Object.keys(patch).length) {
      open.value = false
      return
    }
    const parsed = supplierPatchBodySchema.safeParse(patch)
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      return
    }
    body = parsed.data
  } else {
    const parsed = supplierCreateBodySchema.safeParse({ ...form })
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      return
    }
    body = parsed.data
  }

  saving.value = true
  try {
    await request(s ? `/api/admin/production/suppliers/${s.id}` : '/api/admin/production/suppliers', { method: s ? 'PATCH' : 'POST', body })
    toast.success(s ? 'Proveedor actualizado' : 'Proveedor creado')
    open.value = false
    emit('saved')
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
