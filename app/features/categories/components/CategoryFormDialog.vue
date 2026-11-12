<template>
  <BaseDialog
    v-model:open="open"
    :title="dialogTitle"
    :description="isEdit ? item?.name : dialogDescription"
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

      <FormField :id="`${formId}-description`" label="Descripción" :error="errors.description" hint="Opcional. Se muestra en la tienda.">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea
            :id="id"
            v-model="description"
            v-bind="descriptionAttrs"
            :rows="3"
            maxlength="2000"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting"
          />
        </template>
      </FormField>

      <FormField
        :id="`${formId}-sort`"
        label="Orden"
        :error="errors.sortOrder"
        hint="Menor número aparece antes. Vacío = 0."
      >
        <template #default="{ id, invalid, describedBy }">
          <BaseInput
            :id="id"
            v-model="sortOrder"
            v-bind="sortOrderAttrs"
            inputmode="numeric"
            maxlength="6"
            class="w-32"
            :invalid="invalid"
            :described-by="describedBy"
            :disabled="isSubmitting"
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
        {{ isEdit ? 'Guardar cambios' : kind === 'category' ? 'Crear categoría' : 'Crear subcategoría' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import {
  categoryInputSchema,
  type CategoryRow,
  type SubcategoryRow,
} from '#shared/schemas/categories'
import { slugify } from '#shared/schemas/common'

/**
 * Alta y edición de categorías y subcategorías (mismo formulario, distinto endpoint).
 * Una subcategoría siempre se crea dentro de `categoryId`.
 */
const props = defineProps<{
  kind: 'category' | 'subcategory'
  item: CategoryRow | SubcategoryRow | null
  categoryId?: string
}>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const slugTouched = ref(false)

const isEdit = computed(() => props.item !== null)
const dialogTitle = computed(() => {
  const noun = props.kind === 'category' ? 'categoría' : 'subcategoría'
  return isEdit.value ? `Editar ${noun}` : `Nueva ${noun}`
})
const dialogDescription = computed(() =>
  props.kind === 'category'
    ? 'Agrupa subcategorías y productos de la tienda.'
    : 'Dentro de la categoría. Los productos se asignan a una subcategoría.',
)

/** En categorías con productos el slug no se cambia (la tienda y los productos lo referencian). */
const slugLocked = computed(() => props.kind === 'category' && (props.item?.productCount ?? 0) > 0)
const slugHint = computed(() =>
  slugLocked.value
    ? `No editable: ${props.item?.productCount} producto(s) usan esta categoría.`
    : 'Se usa en la URL de la tienda. Minúsculas, números y guiones.',
)

const formSchema = z.object({
  name: categoryInputSchema.shape.name,
  slug: categoryInputSchema.shape.slug,
  description: z.string().max(2000, 'Máximo 2000 caracteres.'),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{0,6}$/, 'Usa un número entero de hasta 6 cifras.'),
})

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors } = useForm({
  validationSchema: toTypedSchema(formSchema),
})
const [name, nameAttrs] = defineField('name', { validateOnModelUpdate: false })
const [slug, slugAttrs] = defineField('slug', { validateOnModelUpdate: false })
const [description, descriptionAttrs] = defineField('description', { validateOnModelUpdate: false })
const [sortOrder, sortOrderAttrs] = defineField('sortOrder', { validateOnModelUpdate: false })

watch(open, (value) => {
  if (!value) return
  formError.value = null
  slugTouched.value = isEdit.value
  resetForm({
    values: {
      name: props.item?.name ?? '',
      slug: props.item?.slug ?? '',
      description: props.item?.description ?? '',
      sortOrder: props.item ? String(props.item.sortOrder) : '',
    },
  })
})

// En alta, el slug sigue al nombre hasta que el usuario lo edita a mano.
watch(name, (value) => {
  if (!isEdit.value && !slugTouched.value) slug.value = slugify(value ?? '')
})

function endpointFor(): { url: `/api/${string}`; method: 'POST' | 'PATCH' } {
  if (props.kind === 'category') {
    return isEdit.value
      ? { url: `/api/admin/categories/${props.item?.id}`, method: 'PATCH' }
      : { url: '/api/admin/categories', method: 'POST' }
  }
  return isEdit.value
    ? { url: `/api/admin/subcategories/${props.item?.id}`, method: 'PATCH' }
    : { url: `/api/admin/categories/${props.categoryId}/subcategories`, method: 'POST' }
}

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  const sort = values.sortOrder ? Number(values.sortOrder) : 0
  const desc = values.description.trim()
  try {
    if (isEdit.value && props.item) {
      const patch: Record<string, unknown> = {}
      if (values.name !== props.item.name) patch.name = values.name
      if (!slugLocked.value && values.slug !== props.item.slug) patch.slug = values.slug
      if ((props.item.description ?? '') !== desc) patch.description = desc
      if (sort !== props.item.sortOrder) patch.sort_order = sort
      if (!Object.keys(patch).length) {
        open.value = false
        return
      }
      await request(endpointFor().url, { method: 'PATCH', body: patch })
    } else {
      const body = { name: values.name, slug: values.slug, sort_order: sort, ...(desc ? { description: desc } : {}) }
      await request(endpointFor().url, { method: 'POST', body })
    }
    toast.success(
      isEdit.value
        ? props.kind === 'category' ? 'Categoría actualizada' : 'Subcategoría actualizada'
        : props.kind === 'category' ? 'Categoría creada' : 'Subcategoría creada',
    )
    open.value = false
    emit('saved')
  } catch (error) {
    const ui = toUiError(error)
    if (Object.keys(ui.fieldErrors).length) {
      setErrors(Object.fromEntries(Object.entries(ui.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
    }
    if (ui.status === 409) {
      // 409: el nombre o el slug ya existen en este ámbito. El mensaje del Server lo indica.
      if (/nombre/i.test(ui.message)) setErrors({ name: ui.message })
      else setErrors({ slug: ui.message })
    } else formError.value = ui.message
  }
})
</script>
