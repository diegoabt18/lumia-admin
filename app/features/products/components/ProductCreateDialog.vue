<template>
  <BaseDialog
    v-model:open="open"
    title="Nuevo producto"
    description="Crea la ficha del producto. Las variantes (SKU, precio) se agregan después."
    size="lg"
    :busy="isSubmitting"
  >
    <form :id="formId" novalidate @submit="onSubmit">
      <ProductFormFields
        :id-prefix="formId"
        :fields="formFields"
        :errors="errors"
        show-slug
        :disabled="isSubmitting"
        @slug-edited="slugTouched = true"
      />
      <p v-if="formError" role="alert" class="mt-5 rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">Crear producto</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { slugify } from '#shared/schemas/common'
import { productFormSchema, toProductCreateBody } from '#shared/schemas/products'

const emit = defineEmits<{ created: [id: string] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const slugTouched = ref(false)

const initialValues = {
  name: '',
  slug: '',
  categorySlug: '',
  brand: '',
  status: 'active' as const,
  taxRate: '',
  description: '',
}

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(productFormSchema),
  initialValues,
})
const [name] = defineField('name')
const [slug] = defineField('slug')
const [categorySlug] = defineField('categorySlug')
const [brand] = defineField('brand')
const [status] = defineField('status')
const [taxRate] = defineField('taxRate')
const [description] = defineField('description')
/** Objeto plano con refs: el template no las desenvuelve al pasarlo como prop. */
const formFields = { name, slug, categorySlug, brand, status, taxRate, description }

watch(open, (value) => {
  if (!value) return
  formError.value = null
  slugTouched.value = false
  resetForm({ values: initialValues })
})

watch(name, (value) => {
  if (!slugTouched.value) slug.value = slugify(value ?? '')
})

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    const result = await request<{ id: string }>('/api/admin/products', {
      method: 'POST',
      body: toProductCreateBody(values),
    })
    toast.success('Producto creado', 'Ahora puedes completar su información.')
    open.value = false
    emit('created', result.id)
  } catch (error) {
    const ui = toUiError(error)
    if (ui.status === 409) setErrors({ slug: ui.message })
    else formError.value = ui.message
  }
})
</script>
