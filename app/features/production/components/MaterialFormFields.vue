<template>
  <div class="space-y-5">
    <div class="grid gap-5 sm:grid-cols-2">
      <FormField :id="`${idPrefix}-name`" label="Nombre" :error="errors.name" required class="sm:col-span-2">
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.name" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
        </template>
      </FormField>
      <FormField :id="`${idPrefix}-category`" label="Categoría" :error="errors.category" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseSelect :id="id" v-model="form.category" :options="categoryOptions" placeholder="Elige una categoría" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
        </template>
      </FormField>
      <FormField :id="`${idPrefix}-code`" label="Código" :error="errors.code" hint="Opcional. Referencia interna o del proveedor.">
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.code" maxlength="100" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
        </template>
      </FormField>
      <FormField
        :id="`${idPrefix}-unit`"
        label="Unidad de compra"
        :error="errors.purchaseUnit"
        :hint="purchaseUnitLocked ? 'Fija: ya hay costo registrado en esta unidad.' : 'El costo se registra como $ por esta unidad.'"
        required
      >
        <template #default="{ id, invalid, describedBy }">
          <BaseSelect :id="id" v-model="form.purchaseUnit" :options="unitOptions" placeholder="Elige la unidad" :invalid="invalid" :described-by="describedBy" :disabled="disabled || purchaseUnitLocked" />
        </template>
      </FormField>
      <div class="flex items-end pb-2">
        <BaseSwitch :id="`${idPrefix}-active`" v-model="form.active" label="Activo" description="Desactívalo si ya no se compra." :disabled="disabled" />
      </div>
    </div>

    <FormField :id="`${idPrefix}-description`" label="Descripción" :error="errors.description">
      <template #default="{ id, invalid, describedBy }">
        <BaseTextarea :id="id" v-model="form.description" :rows="2" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
      </template>
    </FormField>

    <fieldset class="rounded-xl border border-lumia-ink/[0.08] p-4">
      <legend class="px-1 text-[13px] font-medium text-lumia-ink">Contenido por unidad de compra <span class="font-normal text-lumia-ink/50">(opcional)</span></legend>
      <p class="mb-3 text-[12px] text-lumia-ink/55">Ej.: una caja de 12 unidades, un bidón de 5 l. Lo usan las recetas para repartir el costo.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField :id="`${idPrefix}-cq`" label="Cantidad" :error="errors.contentQuantity">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.contentQuantity" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
          </template>
        </FormField>
        <FormField :id="`${idPrefix}-cu`" label="Unidad" :error="errors.contentUnit">
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect :id="id" v-model="form.contentUnit" :options="contentOptions" placeholder="—" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
          </template>
        </FormField>
      </div>
    </fieldset>

    <fieldset class="rounded-xl border border-lumia-ink/[0.08] p-4">
      <legend class="px-1 text-[13px] font-medium text-lumia-ink">Stock</legend>
      <BaseSwitch :id="`${idPrefix}-stock`" v-model="form.stockEnabled" label="Controlar stock" :disabled="disabled" />
      <div v-if="form.stockEnabled" class="mt-4 grid gap-4 sm:grid-cols-3">
        <FormField :id="`${idPrefix}-sc`" label="Actual" :error="errors.stockCurrent">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.stockCurrent" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
          </template>
        </FormField>
        <FormField :id="`${idPrefix}-sm`" label="Mínimo" :error="errors.stockMinimum">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.stockMinimum" type="number" step="any" min="0" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
          </template>
        </FormField>
        <FormField :id="`${idPrefix}-su`" label="Unidad" :error="errors.stockUnit">
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect :id="id" v-model="form.stockUnit" :options="unitOptions" placeholder="—" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
          </template>
        </FormField>
      </div>
      <p v-if="form.stockEnabled" class="mt-2 text-[12px] text-lumia-ink/50">El stock se guarda como valor absoluto: no hay movimientos ni control de cambios simultáneos.</p>
    </fieldset>

    <FormField :id="`${idPrefix}-image`" label="Clave de imagen" :error="errors.imagePath" hint="Opcional. La que muestra el estudio de imágenes, p. ej. materials/cera-de-soya.">
      <template #default="{ id, invalid, describedBy }">
        <BaseInput :id="id" v-model="form.imagePath" maxlength="200" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="disabled" />
      </template>
    </FormField>
  </div>
</template>

<script setup lang="ts">
import { CONTENT_UNITS, MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, UNITS_OF_MEASURE } from '#shared/schemas/production'
import type { MaterialFormState } from '~/features/production/materialForm'

withDefaults(
  defineProps<{ idPrefix: string; errors: Record<string, string>; disabled?: boolean; purchaseUnitLocked?: boolean }>(),
  { disabled: false, purchaseUnitLocked: false },
)
const form = defineModel<MaterialFormState>('form', { required: true })

const categoryOptions = MATERIAL_CATEGORIES.map((c) => ({ value: c, label: MATERIAL_CATEGORY_LABELS[c] }))
const unitOptions = UNITS_OF_MEASURE.map((u) => ({ value: u, label: u }))
const contentOptions = CONTENT_UNITS.map((u) => ({ value: u, label: u }))
</script>
