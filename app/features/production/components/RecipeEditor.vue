<template>
  <form novalidate class="space-y-6" @submit.prevent="save">
    <BaseCard title="Datos generales">
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${uid}-name`" label="Nombre de la receta" :error="errors.name" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.name" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
          </template>
        </FormField>
        <FormField :id="`${uid}-product`" label="Producto" :error="errors.productSlug" required>
          <div v-if="form.productSlug" class="flex items-center justify-between gap-2 rounded-xl border border-lumia-ink/10 bg-white px-3 py-2">
            <span class="min-w-0">
              <span class="block truncate text-[14px] text-lumia-ink">{{ form.productName || form.productSlug }}</span>
              <code class="block truncate text-[11px] text-lumia-ink/50">{{ form.productSlug }}</code>
            </span>
            <BaseButton v-if="!readOnly" variant="ghost" size="sm" :disabled="saving" @click="clearProduct">Cambiar</BaseButton>
          </div>
          <SearchPicker v-else :id="`${uid}-product`" :search="searchProducts" placeholder="Buscar producto del catálogo…" :invalid="Boolean(errors.productSlug)" :disabled="readOnly || saving" @pick="pickProduct" />
        </FormField>
      </div>
      <p class="mt-3 text-[12px] text-lumia-ink/50">El producto es una referencia de la receta. Asignarla a un producto o variante (para publicar precios) se hará en la etapa de costeo.</p>
    </BaseCard>

    <BaseCard title="Materiales" :description="canPickMaterials ? 'Cantidad que consume una unidad del producto.' : 'Necesitas el permiso de lectura de materiales para editar esta sección.'">
      <p v-if="errors.lines" class="mb-3 text-[12px] text-status-danger">{{ errors.lines }}</p>
      <div v-if="form.lines.length" class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <caption class="sr-only">Materiales de la receta</caption>
          <thead class="text-left text-[12px] text-lumia-ink/55">
            <tr class="border-b border-lumia-ink/[0.08]">
              <th scope="col" class="py-2 pr-3 font-medium">Material</th>
              <th scope="col" class="w-32 py-2 pr-3 font-medium">Cantidad</th>
              <th scope="col" class="w-32 py-2 pr-3 font-medium">Unidad</th>
              <th scope="col" class="w-32 py-2 pr-3 text-right font-medium">Costo</th>
              <th scope="col" class="w-10 py-2"><span class="sr-only">Quitar</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-lumia-ink/[0.05]">
            <tr v-for="(line, index) in form.lines" :key="line.key">
              <td class="py-2 pr-3">
                <span class="block text-lumia-ink">{{ line.materialName }}</span>
                <span v-if="line.purchaseUnit" class="block text-[11px] text-lumia-ink/50">Se compra por {{ line.purchaseUnit }}</span>
                <span v-if="lineError(index)" class="block text-[11px] text-status-danger">{{ lineError(index) }}</span>
              </td>
              <td class="py-2 pr-3">
                <label :for="`${uid}-q-${line.key}`" class="sr-only">Cantidad de {{ line.materialName }}</label>
                <BaseInput :id="`${uid}-q-${line.key}`" v-model="line.quantity" type="number" step="any" min="0" :disabled="readOnly || saving || !canPickMaterials" />
              </td>
              <td class="py-2 pr-3">
                <label :for="`${uid}-u-${line.key}`" class="sr-only">Unidad de {{ line.materialName }}</label>
                <BaseSelect :id="`${uid}-u-${line.key}`" v-model="line.unit" :options="unitOptions" :disabled="readOnly || saving || !canPickMaterials" />
              </td>
              <td class="py-2 pr-3 text-right tabular-nums text-lumia-ink/70">{{ costOf(line.materialId, index) }}</td>
              <td class="py-2 text-right">
                <button
                  v-if="!readOnly && canPickMaterials"
                  type="button"
                  class="rounded p-1 text-lumia-ink/45 hover:text-status-danger"
                  :aria-label="`Quitar ${line.materialName}`"
                  :disabled="saving"
                  @click="form.lines.splice(index, 1)"
                >
                  <IconX class="h-4 w-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-[13px] text-lumia-ink/55">Aún no hay materiales.</p>
      <div v-if="!readOnly && canPickMaterials" class="mt-4 max-w-md">
        <label :for="`${uid}-addmat`" class="mb-1.5 block text-[13px] font-medium text-lumia-ink">Agregar material</label>
        <SearchPicker :id="`${uid}-addmat`" :search="searchMaterials" placeholder="Buscar material activo…" :disabled="saving" @pick="addMaterial" />
      </div>
    </BaseCard>

    <BaseCard title="Costos indirectos y margen" description="Los porcentajes se calculan sobre el costo de materiales.">
      <div class="space-y-3">
        <div v-for="(cost, index) in form.indirectCosts" :key="cost.key" class="grid grid-cols-[1fr_9rem_8rem_auto] items-start gap-2">
          <div>
            <label :for="`${uid}-ic-n-${cost.key}`" class="sr-only">Concepto</label>
            <BaseInput :id="`${uid}-ic-n-${cost.key}`" v-model="cost.name" maxlength="120" placeholder="Concepto (ej. energía)" :invalid="Boolean(indirectError(index, 'name'))" :disabled="readOnly || saving" />
          </div>
          <div>
            <label :for="`${uid}-ic-t-${cost.key}`" class="sr-only">Tipo</label>
            <BaseSelect :id="`${uid}-ic-t-${cost.key}`" v-model="cost.type" :options="indirectTypeOptions" :disabled="readOnly || saving" />
          </div>
          <div>
            <label :for="`${uid}-ic-v-${cost.key}`" class="sr-only">Valor</label>
            <BaseInput :id="`${uid}-ic-v-${cost.key}`" v-model="cost.value" type="number" step="any" min="0" :invalid="Boolean(indirectError(index, 'value'))" :disabled="readOnly || saving" />
          </div>
          <button v-if="!readOnly" type="button" class="mt-2 rounded p-1 text-lumia-ink/45 hover:text-status-danger" aria-label="Quitar costo" :disabled="saving" @click="form.indirectCosts.splice(index, 1)">
            <IconX class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <BaseButton v-if="!readOnly" variant="secondary" size="sm" :disabled="saving || form.indirectCosts.length >= 30" @click="addIndirect">Agregar costo indirecto</BaseButton>
      </div>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <FormField :id="`${uid}-margin`" label="Margen sobre el costo (%)" :error="errors.marginPercentage" hint="Precio sugerido = costo × (1 + margen ÷ 100), redondeado hacia arriba. Sin impuestos.">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.marginPercentage" type="number" step="any" min="0" max="1000" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
          </template>
        </FormField>
        <div v-if="recipe" class="flex items-end pb-2">
          <BaseSwitch :id="`${uid}-active`" v-model="form.active" label="Activa" :disabled="readOnly || saving" />
        </div>
      </div>
      <FormField v-if="recipe" :id="`${uid}-changes`" label="Descripción del cambio" class="mt-5" hint="Queda guardada en el historial de versiones.">
        <template #default="{ id }">
          <BaseInput :id="id" v-model="form.changesDescription" maxlength="500" placeholder="Ej.: cambio de pabilo" :disabled="readOnly || saving" />
        </template>
      </FormField>
    </BaseCard>

    <div
      v-if="!readOnly"
      class="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-lumia-ink/[0.08] bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-end"
    >
      <p v-if="formError" role="alert" class="text-[13px] text-status-danger sm:mr-auto">{{ formError }}</p>
      <span v-else-if="recipe && dirty" class="text-[12px] text-lumia-ink/50 sm:mr-auto">Cambios sin guardar · al guardar se crea la versión {{ recipe.version + 1 }} y se recalcula el costo</span>
      <div class="flex items-center justify-end gap-3">
        <BaseButton v-if="recipe" variant="secondary" :disabled="!dirty || saving" @click="reset">Descartar</BaseButton>
        <BaseButton type="submit" :loading="saving" :disabled="recipe ? !dirty : false">{{ recipe ? 'Guardar y recalcular' : 'Crear receta' }}</BaseButton>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { UNITS_OF_MEASURE, type MaterialList } from '#shared/schemas/production'
import {
  recipeCreateBodySchema,
  recipePatchBodySchema,
  type CostBreakdown,
  type RecipeDetail,
  type RecipeProductOption,
  type RecipeSaveResult,
} from '#shared/schemas/recipes'

/** Alta (`recipe` null) o edición de una receta. Emite el resultado (receta + desglose de costo). */
const props = withDefaults(defineProps<{ recipe: RecipeDetail | null; readOnly?: boolean; breakdown?: CostBreakdown | null }>(), {
  readOnly: false,
  breakdown: null,
})
const emit = defineEmits<{ saved: [result: RecipeSaveResult] }>()

const { request } = useAdminApi()
const auth = useAuth()
const toast = useToast()
const uid = useId()
const canPickMaterials = computed(() => auth.can(PERMISSIONS.MATERIALS_READ))

let keySeq = 0
const nextKey = () => ++keySeq

interface LineState { key: number; materialId: string; materialName: string; purchaseUnit: string | null; unit: string; quantity: string }
interface IndirectState { key: number; name: string; type: 'fixed' | 'percentage'; value: string }

function toState(r: RecipeDetail | null) {
  return {
    name: r?.name ?? '',
    productSlug: r?.productSlug ?? '',
    productName: r?.productName ?? '',
    lines: (r?.lines ?? []).map<LineState>((l) => ({ key: nextKey(), materialId: l.materialId, materialName: l.materialName, purchaseUnit: l.purchaseUnit, unit: l.unit, quantity: String(l.quantity) })),
    indirectCosts: (r?.indirectCosts ?? []).map<IndirectState>((c) => ({ key: nextKey(), name: c.name, type: c.type, value: String(c.value) })),
    marginPercentage: r?.marginPercentage != null ? String(r.marginPercentage) : '',
    active: r?.isActive ?? true,
    changesDescription: '',
  }
}

const form = reactive(toState(props.recipe))
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

function reset() {
  Object.assign(form, toState(props.recipe))
  errors.value = {}
  formError.value = null
}
watch(() => props.recipe, reset)

// v-model en input type="number" entrega number; String() cubre ambos casos.
const num = (v: string | number) => {
  const text = String(v).trim()
  return text === '' ? undefined : Number(text.replace(',', '.'))
}
const linesPayload = () => form.lines.map((l) => ({ materialId: l.materialId, unit: l.unit, quantity: num(l.quantity) }))
const indirectPayload = () => form.indirectCosts.map((c) => ({ name: c.name.trim(), type: c.type, value: num(c.value) }))

const dirty = computed(() => {
  const r = props.recipe
  if (!r) return true
  const base = toState(r)
  const strip = (s: ReturnType<typeof toState>) => JSON.stringify({
    ...s,
    changesDescription: '',
    lines: s.lines.map(({ key: _k, ...rest }) => rest),
    indirectCosts: s.indirectCosts.map(({ key: _k, ...rest }) => rest),
  })
  return strip(base) !== strip(form as ReturnType<typeof toState>)
})

const unitOptions = UNITS_OF_MEASURE.map((u) => ({ value: u, label: u }))
const indirectTypeOptions = [
  { value: 'fixed', label: 'Fijo ($)' },
  { value: 'percentage', label: 'Porcentaje' },
]

function lineError(index: number) {
  return errors.value[`lines.${index}.quantity`] ?? errors.value[`lines.${index}.unit`] ?? errors.value[`lines.${index}.materialId`]
}
function indirectError(index: number, field: string) {
  return errors.value[`indirectCosts.${index}.${field}`]
}
function costOf(materialId: string, index: number) {
  const line = props.breakdown?.lines[index]
  if (!line || line.materialId !== materialId || dirty.value) return '—'
  return formatUnitCost(line.partialCost)
}

// ---------- Selectores ----------
async function searchProducts(term: string) {
  const res = await request<{ items: RecipeProductOption[] }>('/api/admin/production/recipe-products', { query: { search: term || undefined } })
  return res.items.map((p) => ({ value: p.slug, label: p.name, hint: `${p.slug}${p.hasRecipe ? ' · ya tiene receta asignada' : ''}` }))
}
function pickProduct(option: { value: string; label: string }) {
  form.productSlug = option.value
  form.productName = option.label
}
function clearProduct() {
  form.productSlug = ''
  form.productName = ''
}

async function searchMaterials(term: string) {
  const res = await request<MaterialList>('/api/admin/production/materials', { query: { search: term || undefined, active: '1', limit: 25 } })
  return res.items.map((m) => ({
    value: m.id,
    label: m.name,
    hint: `${m.purchaseUnit}${m.lastCost > 0 ? ` · ${formatUnitCost(m.lastCost)}` : ' · sin costo: costará $0'}`,
    purchaseUnit: m.purchaseUnit,
  }))
}
function addMaterial(option: { value: string; label: string; purchaseUnit?: string }) {
  form.lines.push({ key: nextKey(), materialId: option.value, materialName: option.label, purchaseUnit: option.purchaseUnit ?? null, unit: option.purchaseUnit ?? 'unidad', quantity: '' })
}
function addIndirect() {
  form.indirectCosts.push({ key: nextKey(), name: '', type: 'percentage', value: '' })
}

// ---------- Guardar ----------
async function save() {
  if (saving.value) return
  errors.value = {}
  formError.value = null
  const r = props.recipe
  let body: Record<string, unknown>
  if (!r) {
    const parsed = recipeCreateBodySchema.safeParse({
      name: form.name,
      productSlug: form.productSlug,
      lines: linesPayload(),
      indirectCosts: indirectPayload(),
      marginPercentage: num(form.marginPercentage),
    })
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      formError.value = 'Revisa los campos marcados.'
      return
    }
    body = parsed.data
  } else {
    const base = toState(r)
    const patch: Record<string, unknown> = { version: r.version }
    if (form.name.trim() !== base.name) patch.name = form.name
    if (form.productSlug !== base.productSlug) patch.productSlug = form.productSlug
    if (JSON.stringify(linesPayload()) !== JSON.stringify(base.lines.map((l) => ({ materialId: l.materialId, unit: l.unit, quantity: num(l.quantity) })))) patch.lines = linesPayload()
    if (JSON.stringify(indirectPayload()) !== JSON.stringify(base.indirectCosts.map((c) => ({ name: c.name.trim(), type: c.type, value: num(c.value) })))) patch.indirectCosts = indirectPayload()
    if (form.marginPercentage.trim() !== base.marginPercentage.trim()) patch.marginPercentage = num(form.marginPercentage)
    if (form.active !== base.active) patch.active = form.active
    if (form.changesDescription.trim()) patch.changesDescription = form.changesDescription.trim()
    const parsed = recipePatchBodySchema.safeParse(patch)
    if (!parsed.success) {
      errors.value = zodFieldErrors(parsed.error)
      formError.value = 'Revisa los campos marcados.'
      return
    }
    body = parsed.data
  }

  saving.value = true
  try {
    const result = await request<RecipeSaveResult>(r ? `/api/admin/production/recipes/${r.id}` : '/api/admin/production/recipes', {
      method: r ? 'PATCH' : 'POST',
      body,
    })
    if (result.calculationError) toast.error('Receta guardada, pero no se pudo calcular el costo', result.calculationError)
    else toast.success(r ? 'Receta actualizada y recalculada' : 'Receta creada')
    emit('saved', result)
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
