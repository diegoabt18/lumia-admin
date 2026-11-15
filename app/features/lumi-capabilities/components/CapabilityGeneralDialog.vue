<template>
  <BaseDialog v-model:open="open" title="Editar capacidad" description="Título, descripción, módulo y prioridad." :busy="isSubmitting">
    <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
      <FormField :id="`${formId}-title`" label="Título" :error="errors.title" hint="Qué pide la gente, en pocas palabras." required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="title" v-bind="titleAttrs" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
        </template>
      </FormField>

      <FormField :id="`${formId}-description`" label="Descripción" :error="errors.description" hint="Contexto para quien la evalúe. Máximo 2000 caracteres.">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea :id="id" v-model="description" v-bind="descriptionAttrs" :rows="3" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
        </template>
      </FormField>

      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-module`" label="Módulo" :error="errors.module" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect :id="id" v-model="module" :options="moduleOptions" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
          </template>
        </FormField>
        <FormField :id="`${formId}-priority`" label="Prioridad" :error="errors.priority" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect :id="id" v-model="priority" :options="priorityOptions" :invalid="invalid" :described-by="describedBy" :disabled="isSubmitting" />
          </template>
        </FormField>
      </div>

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
import {
  CAPABILITY_MODULE_LABELS,
  CAPABILITY_MODULES,
  CAPABILITY_PRIORITIES,
  CAPABILITY_PRIORITY_META,
  capabilityGeneralSchema,
  capabilityResponseSchema,
  type Capability,
} from '#shared/schemas/lumi-capabilities'

const props = defineProps<{ capability: Capability | null }>()
const emit = defineEmits<{ saved: [capability: Capability] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)

const moduleOptions = CAPABILITY_MODULES.map((m) => ({ value: m, label: CAPABILITY_MODULE_LABELS[m] }))
const priorityOptions = CAPABILITY_PRIORITIES.map((p) => ({ value: p, label: CAPABILITY_PRIORITY_META[p].label }))

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(capabilityGeneralSchema),
})
const [title, titleAttrs] = defineField('title', { validateOnModelUpdate: false })
const [description, descriptionAttrs] = defineField('description', { validateOnModelUpdate: false })
const [module] = defineField('module')
const [priority] = defineField('priority')

watch(open, (value) => {
  if (!value || !props.capability) return
  formError.value = null
  const { title, description, module, priority } = props.capability
  resetForm({ values: { title, description, module, priority } })
})

const onSubmit = handleSubmit(async (values) => {
  if (!props.capability) return
  formError.value = null
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}`, { method: 'PATCH', body: values }),
    )
    toast.success('Capacidad actualizada')
    open.value = false
    emit('saved', capability)
  } catch (error) {
    const ui = toUiError(error)
    setErrors(bffFieldErrors(ui.fieldErrors))
    formError.value = ui.message
  }
})
</script>
