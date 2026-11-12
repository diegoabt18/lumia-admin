<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField :id="`${idPrefix}-name`" label="Nombre" :error="errors.name" required class="sm:col-span-2">
      <template #default="{ id, invalid, describedBy }">
        <BaseInput :id="id" v-model="fields.name.value" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
      </template>
    </FormField>

    <FormField
      v-if="showSlug"
      :id="`${idPrefix}-slug`"
      label="Identificador (slug)"
      :error="errors.slug"
      hint="URL del producto en la tienda. No se podrá cambiar después."
      required
      class="sm:col-span-2"
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          :id="id"
          v-model="fields.slug.value"
          maxlength="120"
          class="font-mono"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled"
          @input="emit('slug-edited')"
        />
      </template>
    </FormField>

    <FormField :id="`${idPrefix}-category`" label="Categoría" :error="errors.categoryId" required>
      <template #default="{ id, invalid, describedBy }">
        <BaseSelect
          :id="id"
          v-model="fields.categoryId.value"
          :options="categorySelectOptions"
          placeholder="Selecciona una categoría"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled || categoriesLoading"
        />
      </template>
    </FormField>

    <FormField
      :id="`${idPrefix}-subcategory`"
      label="Subcategoría"
      :error="errors.subcategoryId"
      :hint="subcategoryHint"
      required
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseSelect
          :id="id"
          v-model="fields.subcategoryId.value"
          :options="subcategoryOptions"
          :placeholder="subcategoryPlaceholder"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled || !fields.categoryId.value || subcategoriesLoading"
        />
      </template>
    </FormField>

    <FormField :id="`${idPrefix}-brand`" label="Marca" :error="errors.brand">
      <template #default="{ id, invalid, describedBy }">
        <BaseInput :id="id" v-model="fields.brand.value" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
      </template>
    </FormField>

    <FormField :id="`${idPrefix}-status`" label="Estado" :error="errors.status" hint="Inactivo: no se muestra ni se vende en la tienda." required>
      <template #default="{ id, invalid, describedBy }">
        <BaseSelect
          :id="id"
          v-model="fields.status.value"
          :options="statusOptions"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled"
        />
      </template>
    </FormField>

    <FormField
      :id="`${idPrefix}-tax`"
      label="IVA (%)"
      :error="errors.taxRate"
      hint="Tarifa incluida en el precio. Vacío = sin configurar (la debe validar contabilidad)."
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          :id="id"
          v-model="fields.taxRate.value"
          inputmode="decimal"
          maxlength="6"
          placeholder="Ej. 19"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled"
        />
      </template>
    </FormField>

    <FormField :id="`${idPrefix}-description`" label="Descripción" :error="errors.description" class="sm:col-span-2">
      <template #default="{ id, invalid, describedBy }">
        <BaseTextarea :id="id" v-model="fields.description.value" :rows="5" maxlength="8000" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
      </template>
    </FormField>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

/**
 * Campos del formulario de producto (alta y edición). El estado vive en el padre (vee-validate).
 * Categoría y subcategoría se eligen en cascada: al cambiar de categoría se limpia la subcategoría
 * si ya no pertenece a la nueva categoría.
 */
const props = withDefaults(
  defineProps<{
    idPrefix: string
    fields: {
      name: Ref<string | undefined>
      slug: Ref<string | undefined>
      categoryId: Ref<string | undefined>
      subcategoryId: Ref<string | undefined>
      brand: Ref<string | undefined>
      status: Ref<'active' | 'inactive' | undefined>
      taxRate: Ref<string | undefined>
      description: Ref<string | undefined>
    }
    errors: Partial<Record<string, string>>
    showSlug?: boolean
    disabled?: boolean
    /** Categoría y subcategoría ya asignadas al producto (se conservan aunque estén inactivas). */
    currentCategoryId?: string | null
    currentSubcategoryId?: string | null
  }>(),
  { showSlug: false, disabled: false, currentCategoryId: null, currentSubcategoryId: null },
)

const emit = defineEmits<{ 'slug-edited': [] }>()

const { options: categoryOptionsRaw, truncated, loading: categoriesLoading } = useCategoryOptions()
const { options: subcategoryOptionsRaw, loading: subcategoriesLoading, isAssignable, errorMessage: subcategoriesError } =
  useSubcategoryOptions(
    computed(() => props.fields.categoryId.value || undefined),
    computed(() => props.currentSubcategoryId ?? undefined),
  )

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

/** Solo categorías activas para nuevas asignaciones; la actual se conserva aunque esté inactiva. */
const categorySelectOptions = computed(() => {
  const list = categoryOptionsRaw.value
    .filter((o) => o.active || o.id === props.currentCategoryId)
    .map((o) => ({
      value: o.id,
      label: o.active ? o.label : `${o.label} (inactiva)`,
      disabled: !o.active && o.id !== props.currentCategoryId,
    }))
  const current = props.currentCategoryId
  if (current && !list.some((o) => o.value === current)) {
    list.unshift({ value: current, label: 'Categoría no encontrada', disabled: true })
  }
  return list
})

const subcategoryOptions = computed(() => subcategoryOptionsRaw.value)

const subcategoryPlaceholder = computed(() => {
  if (!props.fields.categoryId.value) return 'Elige primero una categoría'
  if (!subcategoryOptions.value.length && !subcategoriesLoading.value) return 'Esta categoría no tiene subcategorías'
  return 'Selecciona una subcategoría'
})

const subcategoryHint = computed(() => {
  if (subcategoriesError.value) return subcategoriesError.value
  if (truncated.value) return 'Se muestran las primeras 100 categorías.'
  return undefined
})

// Limpieza en cascada: si la subcategoría elegida ya no pertenece a la categoría activa, se borra.
watch(
  () => [props.fields.categoryId.value, subcategoriesLoading.value] as const,
  ([, loadingNow]) => {
    if (loadingNow) return
    const sub = props.fields.subcategoryId.value
    // isAssignable mira solo la categoría cargada: si la subcategoría es de otra categoría, se limpia.
    if (sub && !isAssignable(sub)) props.fields.subcategoryId.value = undefined
  },
)
</script>
