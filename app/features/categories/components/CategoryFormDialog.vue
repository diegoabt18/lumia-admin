<template>
  <BaseDialog
    v-model:open="open"
    :title="isEdit ? 'Editar categoría' : 'Nueva categoría'"
    :description="isEdit ? category?.name : 'Agrupa productos del catálogo de la tienda.'"
    :busy="isSubmitting"
  >
    <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
      <FormField :id="`${formId}-name`" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput
            :id="id"
            v-model="name"
            v-bind="nameAttrs"
            maxlength="120"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting"
          />
        </template>
      </FormField>

      <FormField
        :id="`${formId}-slug`"
        label="Identificador (slug)"
        :error="errors.slug"
        :hint="slugHint"
        required
      >
        <template #default="{ id, invalid, describedBy }">
          <BaseInput
            :id="id"
            v-model="slug"
            v-bind="slugAttrs"
            maxlength="120"
            class="font-mono"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting || slugLocked"
            @input="slugTouched = true"
          />
        </template>
      </FormField>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="isSubmitting">
        {{ isEdit ? 'Guardar cambios' : 'Crear categoría' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { categoryInputSchema, type CategoryRow } from '#shared/schemas/categories'
import { slugify } from '#shared/schemas/common'

const props = defineProps<{ category: CategoryRow | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const slugTouched = ref(false)

const isEdit = computed(() => props.category !== null)
/** El Server no actualiza los productos al cambiar el slug: solo se permite sin productos. */
const slugLocked = computed(() => (props.category?.productCount ?? 0) > 0)
const slugHint = computed(() =>
  slugLocked.value
    ? `No editable: ${props.category?.productCount} producto(s) usan este slug.`
    : 'Se usa en la URL de la tienda. Minúsculas, números y guiones.',
)

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(categoryInputSchema),
})
const [name, nameAttrs] = defineField('name', { validateOnModelUpdate: false })
const [slug, slugAttrs] = defineField('slug', { validateOnModelUpdate: false })

watch(open, (value) => {
  if (!value) return
  formError.value = null
  slugTouched.value = isEdit.value
  resetForm({ values: { name: props.category?.name ?? '', slug: props.category?.slug ?? '' } })
})

// En alta, el slug sigue al nombre hasta que el usuario lo edita a mano.
watch(name, (value) => {
  if (!isEdit.value && !slugTouched.value) slug.value = slugify(value ?? '')
})

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    if (props.category) {
      const patch: Record<string, string> = {}
      if (values.name !== props.category.name) patch.name = values.name
      if (!slugLocked.value && values.slug !== props.category.slug) patch.slug = values.slug
      if (!Object.keys(patch).length) {
        open.value = false
        return
      }
      await request(`/api/admin/categories/${props.category.id}`, { method: 'PATCH', body: patch })
      toast.success('Categoría actualizada')
    } else {
      await request('/api/admin/categories', { method: 'POST', body: values })
      toast.success('Categoría creada')
    }
    open.value = false
    emit('saved')
  } catch (error) {
    const ui = toUiError(error)
    if (Object.keys(ui.fieldErrors).length) {
      setErrors(Object.fromEntries(Object.entries(ui.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
    }
    if (ui.status === 409) setErrors({ slug: ui.message })
    else formError.value = ui.message
  }
})
</script>
