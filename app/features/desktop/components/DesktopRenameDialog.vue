<template>
  <BaseDialog v-model:open="open" title="Renombrar equipo" description="Es el nombre que usa Lumi para referirse a este equipo." size="sm" :busy="isSubmitting">
    <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
      <FormField :id="`${formId}-name`" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="name" v-bind="nameAttrs" maxlength="64" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
        </template>
      </FormField>
      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">Guardar</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { desktopRenameInputSchema, type DesktopDevice } from '#shared/schemas/desktop'

const props = defineProps<{ device: DesktopDevice }>()
const emit = defineEmits<{ saved: [device: DesktopDevice] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(desktopRenameInputSchema),
})
const [name, nameAttrs] = defineField('name', { validateOnModelUpdate: false })

watch(open, (value) => {
  if (!value) return
  formError.value = null
  resetForm({ values: { name: props.device.name } })
})

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    const device = await request<DesktopDevice>(`/api/admin/desktop/devices/${props.device.id}`, {
      method: 'PATCH',
      body: { name: values.name },
    })
    toast.success('Equipo renombrado')
    open.value = false
    emit('saved', device)
  } catch (error) {
    const ui = toUiError(error)
    if (ui.fieldErrors.name?.[0]) setErrors({ name: ui.fieldErrors.name[0] })
    else formError.value = ui.message
  }
})
</script>
