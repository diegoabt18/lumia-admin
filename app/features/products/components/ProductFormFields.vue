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

    <FormField :id="`${idPrefix}-category`" label="Categoría" :error="errors.categorySlug" :hint="categoryHint">
      <template #default="{ id, invalid, describedBy }">
        <BaseSelect
          :id="id"
          v-model="fields.categorySlug.value"
          :options="categoryOptions"
          placeholder="Sin categoría"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="disabled || categoriesLoading"
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

/** Campos del formulario de producto (alta y edición). El estado vive en el padre (vee-validate). */
const props = withDefaults(
  defineProps<{
    idPrefix: string
    fields: {
      name: Ref<string | undefined>
      slug: Ref<string | undefined>
      categorySlug: Ref<string | undefined>
      brand: Ref<string | undefined>
      status: Ref<'active' | 'inactive' | undefined>
      taxRate: Ref<string | undefined>
      description: Ref<string | undefined>
    }
    errors: Partial<Record<string, string>>
    showSlug?: boolean
    disabled?: boolean
    /** Slug actual del producto: se conserva como opción aunque la categoría ya no exista. */
    currentCategorySlug?: string | null
  }>(),
  { showSlug: false, disabled: false, currentCategorySlug: null },
)

const emit = defineEmits<{ 'slug-edited': [] }>()

const { options, truncated, loading: categoriesLoading } = useCategoryOptions()

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const categoryOptions = computed(() => {
  const list = [...options.value]
  const current = props.currentCategorySlug
  if (current && !list.some((o) => o.value === current)) {
    list.unshift({ value: current, label: `${current} (no encontrada)` })
  }
  return list
})

const categoryHint = computed(() =>
  truncated.value ? 'Se muestran las primeras 100 categorías.' : undefined,
)
</script>
