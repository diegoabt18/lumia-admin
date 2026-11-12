<template>
  <BaseDialog
    v-model:open="open"
    :title="source ? `Duplicar “${source.name}”` : 'Nuevo rol'"
    :description="source ? 'La copia conserva permisos, denegaciones y herencia del original. No tendrá usuarios asignados.' : 'Después de crearlo podrás elegir sus permisos.'"
    :busy="isSubmitting"
  >
    <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
      <FormField :id="`${formId}-name`" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="name" v-bind="nameAttrs" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
        </template>
      </FormField>

      <FormField
        :id="`${formId}-key`"
        label="Clave"
        :error="errors.key"
        hint="Identificador técnico único. No se puede cambiar después."
        required
      >
        <template #default="{ id, invalid, describedBy }">
          <BaseInput
            :id="id"
            v-model="key"
            v-bind="keyAttrs"
            maxlength="64"
            class="font-mono"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting"
            @input="keyTouched = true"
          />
        </template>
      </FormField>

      <FormField v-if="!source" :id="`${formId}-description`" label="Descripción" :error="errors.description">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea :id="id" v-model="description" v-bind="descriptionAttrs" :rows="3" maxlength="500" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
        </template>
      </FormField>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">{{ source ? 'Duplicar' : 'Crear rol' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { roleIdentitySchema, type RoleSummary } from '#shared/schemas/roles'

/** Alta (`source` null) o duplicado de un rol. Emite el id del rol creado. */
const props = defineProps<{ source: RoleSummary | null }>()
const emit = defineEmits<{ created: [id: string] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const keyTouched = ref(false)

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(roleIdentitySchema),
})
const [name, nameAttrs] = defineField('name', { validateOnModelUpdate: false })
const [key, keyAttrs] = defineField('key', { validateOnModelUpdate: false })
const [description, descriptionAttrs] = defineField('description', { validateOnModelUpdate: false })

function toKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+|_+$/g, '')
    .slice(0, 64)
}

watch(open, (value) => {
  if (!value) return
  formError.value = null
  keyTouched.value = false
  const base = props.source
  resetForm({
    values: base
      ? { name: `${base.name} (copia)`.slice(0, 120), key: `${base.key}_copia`.slice(0, 64), description: '' }
      : { name: '', key: '', description: '' },
  })
  if (base) keyTouched.value = true
})

watch(name, (value) => {
  if (!keyTouched.value) key.value = toKey(value ?? '')
})

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    const result = props.source
      ? await request<{ id: string }>(`/api/admin/roles/${props.source.id}/duplicate`, {
          method: 'POST',
          body: { key: values.key, name: values.name },
        })
      : await request<{ id: string }>('/api/admin/roles', {
          method: 'POST',
          body: { key: values.key, name: values.name, description: values.description ?? '', permissionKeys: [] },
        })
    toast.success(props.source ? 'Rol duplicado' : 'Rol creado')
    open.value = false
    emit('created', result.id)
  } catch (error) {
    const ui = toUiError(error)
    if (Object.keys(ui.fieldErrors).length) {
      setErrors(Object.fromEntries(Object.entries(ui.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
    }
    if (ui.status === 409) setErrors({ key: ui.message })
    else formError.value = ui.message
  }
})
</script>
