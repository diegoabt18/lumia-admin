<template>
  <form novalidate class="space-y-6" @submit.prevent="onSubmit">
    <div class="grid gap-6 xl:grid-cols-3">
      <div class="space-y-6 xl:col-span-2">
        <BaseCard title="Datos de la promoción">
          <div class="grid gap-5 sm:grid-cols-2">
            <FormField id="promo-name" label="Nombre" :error="errors.name" required class="sm:col-span-2">
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="form.name" maxlength="200" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-description" label="Descripción" :error="errors.description" class="sm:col-span-2">
              <template #default="{ id, invalid, describedBy }">
                <BaseTextarea :id="id" v-model="form.description" :rows="3" maxlength="8000" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-starts" :label="`Inicio (${timezoneLabel})`" :error="errors.startsAt" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="form.startsLocal" type="datetime-local" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-ends" :label="`Fin (${timezoneLabel})`" :error="errors.endsAt" required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="form.endsLocal" type="datetime-local" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-priority" label="Prioridad" :error="errors.priority" hint="Si dos promociones aplican al mismo producto, decide el Server según la prioridad." required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="form.priority" inputmode="numeric" maxlength="6" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-banner" label="Imagen de la promoción (URL)" :error="errors.bannerUrl" hint="Opcional. Solo https://.">
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="form.bannerUrl" type="url" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
              </template>
            </FormField>
            <FormField id="promo-color" label="Color de la etiqueta en la tienda" :error="errors.color" hint="Fondo de la etiqueta «Promoción» y del descuento. Vacío = dorado Lumia.">
              <template #default="{ id, invalid, describedBy }">
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.color"
                    type="color"
                    class="h-10 w-12 cursor-pointer rounded-md border border-lumia-ink/15 bg-white p-1"
                    :disabled="readOnly || saving"
                    aria-label="Selector de color"
                  >
                  <BaseInput :id="id" v-model="form.color" maxlength="7" class="font-mono" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
                  <span class="inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold text-white" :style="{ backgroundColor: form.color }">Promoción</span>
                </div>
              </template>
            </FormField>
            <div class="sm:col-span-2">
              <BaseCheckbox id="promo-active" v-model="form.active">Activa (si la desactivas, deja de aplicar aunque esté en fechas)</BaseCheckbox>
            </div>
          </div>
        </BaseCard>

        <BaseCard title="Productos incluidos" description="Cada producto puede tener su propio porcentaje; vacío = usa el descuento general.">
          <ProductPicker :selected="form.productEntries.map((e) => e.productSlug)" :disabled="readOnly || saving" @add="addProduct" />
          <p v-if="errors.productEntries" class="mt-3 text-[13px] text-status-danger" role="alert">{{ errors.productEntries }}</p>
          <ul v-if="form.productEntries.length" class="mt-4 divide-y divide-lumia-ink/[0.05] rounded-xl border border-lumia-ink/[0.07]">
            <li v-for="(entry, i) in form.productEntries" :key="entry.productSlug" class="flex flex-wrap items-start gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-lumia-ink">{{ productNames[entry.productSlug] ?? entry.productSlug }}</p>
                <p class="font-mono text-[11px] text-lumia-ink/45">{{ entry.productSlug }}</p>
              </div>
              <div class="w-32">
                <label :for="`promo-pct-${i}`" class="sr-only">Descuento de {{ entry.productSlug }}</label>
                <BaseInput
                  :id="`promo-pct-${i}`"
                  v-model="entry.percentOff"
                  inputmode="decimal"
                  maxlength="5"
                  :placeholder="form.applyGeneralDiscount ? 'General' : '% req.'"
                  :invalid="Boolean(errors[`productEntries.${i}.percentOff`])"
                  :disabled="readOnly || saving"
                />
                <p v-if="errors[`productEntries.${i}.percentOff`]" class="mt-1 text-[12px] text-status-danger" role="alert">{{ errors[`productEntries.${i}.percentOff`] }}</p>
              </div>
              <BaseButton v-if="!readOnly" variant="ghost" size="sm" :disabled="saving" @click="form.productEntries.splice(i, 1)">
                <template #icon><IconX class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                <span class="sr-only">Quitar {{ entry.productSlug }}</span>
              </BaseButton>
            </li>
          </ul>
        </BaseCard>
      </div>

      <div class="space-y-6">
        <BaseCard title="Descuento">
          <BaseCheckbox id="promo-general" v-model="form.applyGeneralDiscount">Aplicar descuento general</BaseCheckbox>
          <FormField v-if="form.applyGeneralDiscount" id="promo-general-pct" class="mt-4" label="Porcentaje general (%)" :error="errors.generalPercentOff" required>
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="form.generalPercentOff" inputmode="decimal" maxlength="5" :invalid="invalid" :described-by="describedBy" :disabled="readOnly || saving" />
            </template>
          </FormField>
          <p class="mt-3 text-[12px] text-lumia-ink/50">Sin descuento general solo se pueden incluir productos, cada uno con su porcentaje.</p>
        </BaseCard>

        <BaseCard title="Categorías" description="Todos los productos de la categoría. Requiere descuento general.">
          <p v-if="errors.categorySlugs" class="mb-3 text-[13px] text-status-danger" role="alert">{{ errors.categorySlugs }}</p>
          <div v-if="categoriesLoading" class="space-y-2"><BaseSkeleton v-for="n in 4" :key="n" class="h-4 w-2/3" /></div>
          <p v-else-if="!categoryOptions.length" class="text-[13px] text-lumia-ink/50">No hay categorías.</p>
          <fieldset v-else class="max-h-72 space-y-2 overflow-y-auto pr-1">
            <legend class="sr-only">Categorías incluidas</legend>
            <label v-for="opt in categoryOptions" :key="opt.value" class="flex cursor-pointer items-center gap-2.5 text-sm text-lumia-ink/80">
              <input
                v-model="form.categorySlugs"
                type="checkbox"
                :value="opt.value"
                class="h-4 w-4 accent-lumia-ink"
                :disabled="readOnly || saving || !form.applyGeneralDiscount"
              >
              {{ opt.label }}
            </label>
          </fieldset>
          <p v-if="truncated" class="mt-2 text-[12px] text-lumia-ink/45">Se muestran las primeras 100 categorías.</p>
        </BaseCard>
      </div>
    </div>

    <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
      {{ formError }}
    </p>

    <div v-if="!readOnly" class="flex justify-end gap-3 border-t border-lumia-ink/[0.06] pt-5">
      <BaseButton variant="secondary" to="/promotions" :disabled="saving">Cancelar</BaseButton>
      <BaseButton type="submit" :loading="saving">{{ promotion ? 'Guardar cambios' : 'Crear promoción' }}</BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'
import { promotionBodySchema, type PromotionBody, type PromotionDetail } from '#shared/schemas/promotions'
import { isoToZonedLocal, zonedLocalToIso } from '#shared/utils/datetime'

/**
 * Editor de promoción (alta y edición). Valida con el mismo esquema que el BFF
 * (promotionBodySchema, que replica las reglas de negocio del Server) y muestra cada error en su campo.
 */
const props = defineProps<{ promotion: PromotionDetail | null; readOnly?: boolean }>()
const emit = defineEmits<{ saved: [id: string] }>()

const { request } = useAdminApi()
const toast = useToast()
const { storeTimezone } = useRuntimeConfig().public
const timezoneLabel = 'hora de la tienda'
const { options: categoryOptions, truncated, loading: categoriesLoading } = useCategoryOptions()

interface EntryRow { productSlug: string; percentOff: string }
const form = reactive({
  name: '',
  description: '',
  bannerUrl: '',
  color: '#C9A24A',
  active: true,
  startsLocal: '',
  endsLocal: '',
  priority: '100',
  applyGeneralDiscount: true,
  generalPercentOff: '',
  categorySlugs: [] as string[],
  productEntries: [] as EntryRow[],
})
const productNames = reactive<Record<string, string>>({})
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

function load(p: PromotionDetail | null) {
  form.name = p?.name ?? ''
  form.description = p?.description ?? ''
  form.bannerUrl = p?.bannerUrl ?? ''
  form.color = p?.color || '#C9A24A'
  form.active = p?.active ?? true
  form.startsLocal = p ? isoToZonedLocal(p.startsAt, storeTimezone) : ''
  form.endsLocal = p ? isoToZonedLocal(p.endsAt, storeTimezone) : ''
  form.priority = String(p?.priority ?? 100)
  form.applyGeneralDiscount = p?.applyGeneralDiscount ?? true
  form.generalPercentOff = p?.generalPercentOff !== null && p?.generalPercentOff !== undefined ? String(p.generalPercentOff) : ''
  form.categorySlugs = [...(p?.categorySlugs ?? [])]
  form.productEntries = (p?.productEntries ?? []).map((e) => ({ productSlug: e.productSlug, percentOff: e.percentOff === null ? '' : String(e.percentOff) }))
  errors.value = {}
  formError.value = null
}
watch(() => props.promotion, load, { immediate: true })

function addProduct(product: { slug: string; name: string }) {
  productNames[product.slug] = product.name
  if (!form.productEntries.some((e) => e.productSlug === product.slug)) {
    form.productEntries.push({ productSlug: product.slug, percentOff: '' })
  }
}

function parsePercent(raw: string, path: string, out: Record<string, string>): number | null {
  const v = raw.trim()
  if (!v) return null
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v) || Number(v) > 100) {
    out[path] = 'Porcentaje entre 0 y 100.'
    return null
  }
  return Number(v)
}

/** Convierte el formulario en el cuerpo del BFF; acumula errores de formato por campo. */
function buildBody(): { body: PromotionBody | null; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {}
  const startsAt = zonedLocalToIso(form.startsLocal, storeTimezone)
  const endsAt = zonedLocalToIso(form.endsLocal, storeTimezone)
  if (!startsAt) fieldErrors.startsAt = 'Indica la fecha y hora de inicio.'
  if (!endsAt) fieldErrors.endsAt = 'Indica la fecha y hora de fin.'
  if (!/^\d{1,6}$/.test(form.priority.trim())) fieldErrors.priority = 'Entero entre 0 y 999999.'

  const candidate = {
    name: form.name,
    description: form.description,
    bannerUrl: form.bannerUrl.trim(),
    color: form.color.trim(),
    active: form.active,
    startsAt: startsAt ?? '',
    endsAt: endsAt ?? '',
    priority: Number.parseInt(form.priority, 10) || 0,
    applyGeneralDiscount: form.applyGeneralDiscount,
    generalPercentOff: form.applyGeneralDiscount ? parsePercent(form.generalPercentOff, 'generalPercentOff', fieldErrors) : null,
    categorySlugs: form.applyGeneralDiscount ? form.categorySlugs : [],
    productEntries: form.productEntries.map((e, i) => ({
      productSlug: e.productSlug,
      percentOff: parsePercent(e.percentOff, `productEntries.${i}.percentOff`, fieldErrors),
    })),
  }

  const parsed = promotionBodySchema.safeParse(candidate)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
  }
  return { body: parsed.success && !Object.keys(fieldErrors).length ? parsed.data : null, fieldErrors }
}

async function onSubmit() {
  if (saving.value || props.readOnly) return
  formError.value = null
  const { body, fieldErrors } = buildBody()
  errors.value = fieldErrors
  if (!body) {
    formError.value = 'Revisa los campos marcados.'
    return
  }
  saving.value = true
  try {
    if (props.promotion) {
      await request(`/api/admin/promotions/${props.promotion.id}`, { method: 'PUT', body })
      toast.success('Promoción actualizada')
      emit('saved', props.promotion.id)
    } else {
      const res = await request<{ id: string }>('/api/admin/promotions', { method: 'POST', body })
      toast.success('Promoción creada')
      emit('saved', res.id)
    }
  } catch (error) {
    const ui = toUiError(error)
    errors.value = Object.fromEntries(Object.entries(ui.fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
