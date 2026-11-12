<template>
  <BaseDialog v-model:open="open" title="Nuevo material" description="El costo se registra después, en el historial de precios." size="lg" :busy="saving">
    <form :id="formId" novalidate @submit.prevent="save">
      <MaterialFormFields v-model:form="form" :id-prefix="formId" :errors="errors" :disabled="saving" />
      <p v-if="formError" role="alert" class="mt-5 rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">Crear material</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { materialCreateBodySchema } from '#shared/schemas/production'
import { emptyMaterialForm, materialFormToBody } from '~/features/production/materialForm'

const emit = defineEmits<{ created: [id: string] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const form = ref(emptyMaterialForm())
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

watch(open, (value) => {
  if (!value) return
  form.value = emptyMaterialForm()
  errors.value = {}
  formError.value = null
})

async function save() {
  if (saving.value) return
  errors.value = {}
  formError.value = null
  const body = materialFormToBody(form.value)
  if (!form.value.stockEnabled) {
    delete body.stockCurrent
    delete body.stockMinimum
    delete body.stockUnit
  }
  const parsed = materialCreateBodySchema.safeParse(body)
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error)
    formError.value = 'Revisa los campos marcados.'
    return
  }
  saving.value = true
  try {
    const result = await request<{ id: string }>('/api/admin/production/materials', { method: 'POST', body: parsed.data })
    toast.success('Material creado')
    open.value = false
    emit('created', result.id)
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
