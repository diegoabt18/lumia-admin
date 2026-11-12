<template>
  <div>
    <PageHeader
      eyebrow="Catálogo"
      title="Imágenes"
      description="Convierte una imagen original a los tamaños y formatos (AVIF y WebP) que usa la tienda."
    />

    <div
      class="mb-5 rounded-xl border border-status-info/20 bg-status-info-soft/50 px-4 py-3 text-[13px] leading-relaxed text-status-info"
      role="note"
    >
      El servidor solo convierte: <strong>no guarda ni publica</strong> las imágenes. Descarga el ZIP y súbelo al repositorio de imágenes respetando
      las rutas de cada archivo (por ejemplo <code>products/&lt;slug&gt;/…</code>).
    </div>

    <div class="mb-4 flex gap-1 border-b border-lumia-ink/[0.08]" role="tablist" aria-label="Tipo de imagen">
      <button
        v-for="opt in tabs"
        :id="`images-tab-${opt.value}`"
        :key="opt.value"
        type="button"
        role="tab"
        :aria-selected="tab === opt.value"
        aria-controls="images-panel"
        class="-mb-px border-b-2 px-4 py-2.5 text-[14px] font-medium transition-colors"
        :class="tab === opt.value ? 'border-lumia-ink text-lumia-ink' : 'border-transparent text-lumia-ink/55 hover:text-lumia-ink'"
        :disabled="generating"
        @click="setTab(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div id="images-panel" role="tabpanel" :aria-labelledby="`images-tab-${tab}`" class="space-y-6">
      <BaseCard :title="tabTitle" :description="tabDescription">
        <form :id="formId" novalidate class="space-y-6" @submit.prevent="generate">
          <!-- Identificación -->
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-if="tab !== 'site'" :id="`${formId}-slug`" :label="tab === 'product' ? 'Slug del producto' : 'Slug del material'" :error="errors.slug" hint="Minúsculas, números y guiones. Debe coincidir con el slug real." required>
              <template #default="{ id, invalid, describedBy }">
                <BaseInput :id="id" v-model="slug" class="font-mono" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="generating" />
              </template>
            </FormField>
            <template v-else>
              <FormField :id="`${formId}-kind`" label="Uso en el sitio" required>
                <template #default="{ id }">
                  <BaseSelect :id="id" v-model="siteKind" :options="siteKindOptions" :disabled="generating" />
                </template>
              </FormField>
              <FormField v-if="siteMeta.numbered" :id="`${formId}-index`" label="Posición" :error="errors.index" :hint="`De 1 a ${siteMeta.maxIndex}. Reemplaza el archivo de esa posición.`" required>
                <template #default="{ id, invalid, describedBy }">
                  <BaseSelect :id="id" v-model="siteIndex" :options="indexOptions" :invalid="invalid" :described-by="describedBy" :disabled="generating" />
                </template>
              </FormField>
            </template>
          </div>

          <!-- Archivos -->
          <div class="space-y-4">
            <div>
              <p class="mb-2 text-[13px] font-medium text-lumia-ink">{{ tab === 'product' ? 'Imagen principal' : 'Imagen' }}</p>
              <ImageFilePicker v-model="mainFiles" :disabled="generating" />
              <p v-if="errors.main" class="mt-1 text-[12px] text-status-danger">{{ errors.main }}</p>
            </div>
            <div v-if="tab === 'product'">
              <p class="mb-2 text-[13px] font-medium text-lumia-ink">Galería <span class="font-normal text-lumia-ink/50">(opcional)</span></p>
              <ImageFilePicker v-model="galleryFiles" multiple :max="IMAGE_MAX_GALLERY" :disabled="generating" />
            </div>
            <p class="text-[12px] text-lumia-ink/50">Peso total: {{ totalMb }} MB de 40 MB por envío.</p>
          </div>

          <!-- Ajustes -->
          <details class="rounded-xl border border-lumia-ink/[0.08] p-4">
            <summary class="cursor-pointer text-[13px] font-medium text-lumia-ink">Ajustes de conversión</summary>
            <div class="mt-4">
              <ImageConfigFields v-model="config" :disabled="generating" :hex-error="errors.customHex" />
            </div>
          </details>

          <div class="flex flex-col gap-3 border-t border-lumia-ink/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-end">
            <p v-if="formError" role="alert" class="text-[13px] text-status-danger sm:mr-auto">{{ formError }}</p>
            <p v-else-if="generating" class="text-[12px] text-lumia-ink/55 sm:mr-auto" role="status">Generando… puede tardar hasta un par de minutos.</p>
            <BaseButton type="submit" :loading="generating" :disabled="!canSubmit">Generar variantes</BaseButton>
          </div>
        </form>
      </BaseCard>

      <ImageResults v-if="result" :result="result" :zip-name="zipName" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  DEFAULT_IMAGE_CONFIG,
  defaultSiteConfig,
  IMAGE_MAX_GALLERY,
  IMAGE_MAX_REQUEST_BYTES,
  imageStudioConfigSchema,
  MATERIAL_IMAGE_SIZES,
  PRODUCT_IMAGE_SIZES,
  PRODUCT_IMAGE_SLUG_PATTERN,
  SITE_IMAGE_KIND_IDS,
  SITE_IMAGE_KINDS,
  type ImageGenerationResult,
  type ImageStudioConfig,
  type SiteImageKind,
} from '#shared/schemas/images'

definePageMeta({
  layout: 'admin',
  title: 'Imágenes',
  permissions: [PERMISSIONS.PRODUCTS_UPDATE, PERMISSIONS.MATERIALS_UPDATE],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Imágenes' }],
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()

type Tab = 'product' | 'site' | 'material'
const tabs = computed(() => {
  const list: { value: Tab; label: string }[] = []
  if (auth.can(PERMISSIONS.PRODUCTS_UPDATE)) list.push({ value: 'product', label: 'Producto' }, { value: 'site', label: 'Sitio' })
  if (auth.can(PERMISSIONS.MATERIALS_UPDATE)) list.push({ value: 'material', label: 'Material' })
  return list
})
const tab = computed<Tab>(() => {
  const wanted = route.query.tab
  return tabs.value.find((t) => t.value === wanted)?.value ?? tabs.value[0]?.value ?? 'product'
})
function setTab(value: Tab) {
  if (value !== tab.value) void router.replace({ query: { tab: value === 'product' ? undefined : value } })
}

const tabTitle = computed(() => ({ product: 'Imagen de producto', site: 'Imagen del sitio', material: 'Imagen de material' })[tab.value])
const tabDescription = computed(() => {
  if (tab.value === 'product') return `Genera ${PRODUCT_IMAGE_SIZES.length} tamaños (${PRODUCT_IMAGE_SIZES.map((s) => s.split(' ')[1]).join(', ')} px) en AVIF y WebP para la principal y cada imagen de galería.`
  if (tab.value === 'material') return `Genera ${MATERIAL_IMAGE_SIZES.length} tamaños (${MATERIAL_IMAGE_SIZES.map((s) => s.split(' ')[1]).join(' y ')} px) en AVIF y WebP.`
  return `Tamaño final: ${siteMeta.value.size} px, en AVIF y WebP.`
})

// ---------- Formulario ----------
const formId = useId()
const slug = ref('')
const siteKind = ref<SiteImageKind>('home')
const siteIndex = ref('1')
const mainFiles = ref<File[]>([])
const galleryFiles = ref<File[]>([])
const config = ref<ImageStudioConfig>({ ...DEFAULT_IMAGE_CONFIG })
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const generating = ref(false)
const result = shallowRef<ImageGenerationResult | null>(null)
const zipName = ref('imagenes.zip')

const siteMeta = computed(() => SITE_IMAGE_KINDS[siteKind.value])
const siteKindOptions = SITE_IMAGE_KIND_IDS.map((k) => ({ value: k, label: `${SITE_IMAGE_KINDS[k].label} (${SITE_IMAGE_KINDS[k].size})` }))
const indexOptions = computed(() => Array.from({ length: siteMeta.value.maxIndex }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })))

function resetForTab() {
  slug.value = ''
  mainFiles.value = []
  galleryFiles.value = []
  errors.value = {}
  formError.value = null
  result.value = null
  config.value = tab.value === 'site' ? defaultSiteConfig(siteKind.value) : { ...DEFAULT_IMAGE_CONFIG }
}
watch(tab, resetForTab, { immediate: true })
watch(siteKind, (kind) => {
  config.value = defaultSiteConfig(kind)
  siteIndex.value = '1'
})

const totalBytes = computed(() => [...mainFiles.value, ...galleryFiles.value].reduce((s, f) => s + f.size, 0))
const totalMb = computed(() => (totalBytes.value / (1024 * 1024)).toFixed(1))
const canSubmit = computed(() => mainFiles.value.length === 1 && !generating.value)

async function generate() {
  if (!canSubmit.value) return
  errors.value = {}
  formError.value = null

  const cleanSlug = slug.value.trim()
  if (tab.value !== 'site' && !PRODUCT_IMAGE_SLUG_PATTERN.test(cleanSlug)) {
    errors.value = { slug: 'Usa minúsculas, números y guiones (ej. vela-lavanda).' }
    return
  }
  const parsedConfig = imageStudioConfigSchema.safeParse(config.value)
  if (!parsedConfig.success) {
    errors.value = zodFieldErrors(parsedConfig.error)
    formError.value = 'Revisa los ajustes de conversión.'
    return
  }
  if (totalBytes.value > IMAGE_MAX_REQUEST_BYTES) {
    formError.value = 'Las imágenes superan 40 MB en total. Quita algunas de la galería.'
    return
  }

  const form = new FormData()
  form.append('config', JSON.stringify(parsedConfig.data))
  let url: `/api/${string}`
  if (tab.value === 'product') {
    url = '/api/admin/images/product'
    form.append('slug', cleanSlug)
    form.append('main', mainFiles.value[0]!)
    for (const file of galleryFiles.value) form.append('gallery', file)
    zipName.value = `${cleanSlug}-imagenes.zip`
  } else if (tab.value === 'material') {
    url = '/api/admin/images/material'
    form.append('slug', cleanSlug)
    form.append('image', mainFiles.value[0]!)
    zipName.value = `material-${cleanSlug}-imagenes.zip`
  } else {
    url = '/api/admin/images/site'
    form.append('kind', siteKind.value)
    if (siteMeta.value.numbered) form.append('index', siteIndex.value)
    form.append('image', mainFiles.value[0]!)
    zipName.value = `sitio-${siteKind.value}${siteMeta.value.numbered ? `-${siteIndex.value}` : ''}.zip`
  }

  generating.value = true
  result.value = null
  try {
    result.value = await request<ImageGenerationResult>(url, { method: 'POST', body: form })
    toast.success('Variantes generadas', 'Descárgalas antes de salir de la página: no se guardan.')
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    generating.value = false
  }
}
</script>
