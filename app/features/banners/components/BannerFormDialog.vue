<template>
  <BaseDialog
    v-model:open="open"
    :title="banner ? 'Editar banner' : 'Nuevo banner'"
    description="Se muestra en la tienda dentro de su vigencia, si está activo."
    size="lg"
    :busy="saving"
  >
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="onSubmit">
      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-position`" label="Posición" :error="errors.position" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseSelect :id="id" v-model="form.position" :options="positionOptions" placeholder="Elige una posición" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-priority`" label="Prioridad" :error="errors.priority" hint="Entero; ordena banners de la misma posición." required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.priority" inputmode="numeric" maxlength="6" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>

        <FormField :id="`${formId}-image`" label="Imagen (URL)" :error="errors.imageUrl" hint="Solo https://." required class="sm:col-span-2">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.imageUrl" type="url" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <div v-if="previewUrl" class="overflow-hidden rounded-xl border border-lumia-ink/[0.07] bg-lumia-cream/40 sm:col-span-2">
          <img :src="previewUrl" alt="Vista previa del banner" referrerpolicy="no-referrer" class="aspect-[21/9] w-full object-cover">
        </div>

        <FormField :id="`${formId}-title`" label="Título" :error="errors.title">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.title" maxlength="300" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-cta-label`" label="Texto del botón" :error="errors.ctaLabel">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.ctaLabel" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-subtitle`" label="Subtítulo" :error="errors.subtitle" class="sm:col-span-2">
          <template #default="{ id, invalid, describedBy }">
            <BaseTextarea :id="id" v-model="form.subtitle" :rows="2" maxlength="800" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </div>

      <fieldset class="space-y-4 rounded-xl border border-lumia-ink/[0.07] p-4">
        <legend class="px-1 text-[13px] font-medium text-lumia-ink">Destino al hacer clic</legend>
        <p class="text-[12px] text-lumia-ink/50">Se usa el primero definido: enlace, promoción o categoría. Sin ninguno, lleva al catálogo.</p>
        <FormField :id="`${formId}-href`" label="Enlace" :error="errors.ctaHref" hint="Ruta de la tienda (ej. /products?category=velas) o URL https://.">
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.ctaHref" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField :id="`${formId}-promotion`" label="Promoción" :error="errors.promotionId">
            <template #default="{ id, invalid, describedBy }">
              <BaseSelect :id="id" v-model="form.promotionId" :options="promotionOptions" placeholder="Ninguna" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
          <FormField :id="`${formId}-category`" label="Categoría" :error="errors.categorySlug">
            <template #default="{ id, invalid, describedBy }">
              <BaseSelect :id="id" v-model="form.categorySlug" :options="categorySelect" placeholder="Ninguna" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
        </div>
      </fieldset>

      <div class="grid gap-5 sm:grid-cols-2">
        <FormField :id="`${formId}-starts`" label="Inicio (hora de la tienda)" :error="errors.startsAt" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.startsLocal" type="datetime-local" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-ends`" label="Fin (hora de la tienda)" :error="errors.endsAt" required>
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.endsLocal" type="datetime-local" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </div>
      <BaseCheckbox :id="`${formId}-active`" v-model="form.active">Activo</BaseCheckbox>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">{{ banner ? 'Guardar cambios' : 'Crear banner' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { BANNER_POSITION_LABELS, BANNER_POSITIONS, bannerBodySchema, type BannerRow } from '#shared/schemas/banners'
import type { PromotionList } from '#shared/schemas/promotions'
import { isoToZonedLocal, zonedLocalToIso } from '#shared/utils/datetime'

const props = defineProps<{ banner: BannerRow | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const { storeTimezone } = useRuntimeConfig().public
const { options: categoryOptions } = useCategoryOptions()

const positionOptions = BANNER_POSITIONS.map((p) => ({ value: p, label: BANNER_POSITION_LABELS[p] }))

const { data: promotions } = useAsyncData('admin-banner-promotion-options', () =>
  request<PromotionList>('/api/admin/promotions', { query: { limit: 100 } }),
)
const promotionOptions = computed(() => {
  const list = (promotions.value?.items ?? []).map((p) => ({ value: p.id, label: p.name }))
  const current = form.promotionId
  if (current && !list.some((o) => o.value === current)) list.unshift({ value: current, label: `${current} (no listada)` })
  return list
})
const categorySelect = computed(() => {
  const list = [...categoryOptions.value]
  const current = form.categorySlug
  if (current && !list.some((o) => o.value === current)) list.unshift({ value: current, label: `${current} (no encontrada)` })
  return list
})

const form = reactive({
  position: '',
  priority: '100',
  imageUrl: '',
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaHref: '',
  promotionId: '',
  categorySlug: '',
  startsLocal: '',
  endsLocal: '',
  active: true,
})
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

const previewUrl = computed(() => {
  try {
    const url = new URL(form.imageUrl.trim())
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
})

watch(open, (value) => {
  if (!value) return
  const b = props.banner
  form.position = b?.position ?? ''
  form.priority = String(b?.priority ?? 100)
  form.imageUrl = b?.imageUrl ?? ''
  form.title = b?.title ?? ''
  form.subtitle = b?.subtitle ?? ''
  form.ctaLabel = b?.ctaLabel ?? ''
  form.ctaHref = b?.ctaHref ?? ''
  form.promotionId = b?.promotionId ?? ''
  form.categorySlug = b?.categorySlug ?? ''
  form.startsLocal = b ? isoToZonedLocal(b.startsAt, storeTimezone) : ''
  form.endsLocal = b ? isoToZonedLocal(b.endsAt, storeTimezone) : ''
  form.active = b?.active ?? true
  errors.value = {}
  formError.value = null
})

async function onSubmit() {
  if (saving.value) return
  const fieldErrors: Record<string, string> = {}
  const startsAt = zonedLocalToIso(form.startsLocal, storeTimezone)
  const endsAt = zonedLocalToIso(form.endsLocal, storeTimezone)
  if (!startsAt) fieldErrors.startsAt = 'Indica la fecha y hora de inicio.'
  if (!endsAt) fieldErrors.endsAt = 'Indica la fecha y hora de fin.'
  if (!/^\d{1,6}$/.test(form.priority.trim())) fieldErrors.priority = 'Entero entre 0 y 999999.'

  const parsed = bannerBodySchema.safeParse({
    position: form.position,
    imageUrl: form.imageUrl,
    title: form.title,
    subtitle: form.subtitle,
    ctaLabel: form.ctaLabel,
    ctaHref: form.ctaHref.trim(),
    promotionId: form.promotionId,
    categorySlug: form.categorySlug,
    active: form.active,
    priority: Number.parseInt(form.priority, 10) || 0,
    startsAt: startsAt ?? '',
    endsAt: endsAt ?? '',
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key && !fieldErrors[key]) fieldErrors[key] = key === 'imageUrl' && !form.imageUrl.trim() ? 'Ingresa la URL de la imagen.' : issue.message
    }
  }
  errors.value = fieldErrors
  if (!parsed.success || Object.keys(fieldErrors).length) {
    formError.value = 'Revisa los campos marcados.'
    return
  }

  formError.value = null
  saving.value = true
  try {
    if (props.banner) await request(`/api/admin/banners/${props.banner.id}`, { method: 'PUT', body: parsed.data })
    else await request('/api/admin/banners', { method: 'POST', body: parsed.data })
    toast.success(props.banner ? 'Banner actualizado' : 'Banner creado')
    open.value = false
    emit('saved')
  } catch (error) {
    const ui = toUiError(error)
    errors.value = Object.fromEntries(Object.entries(ui.fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}
</script>
