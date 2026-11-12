<template>
  <BaseCard title="Asistente de contenido" description="Sugerencias de Lumi. No cambian el producto: aplícalas y luego pulsa «Guardar cambios».">
    <div class="space-y-4">
      <p v-if="missing.length" class="rounded-xl bg-status-warning-soft/60 px-3 py-2.5 text-[12px] leading-relaxed text-lumia-ink/80">
        <span class="font-medium text-lumia-ink">Por completar:</span> {{ missing.join(', ') }}.
      </p>

      <div class="grid gap-2">
        <BaseButton variant="secondary" size="sm" :disabled="busy" @click="run('generate_title')">Generar título</BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          @click="run(hasDescription ? 'improve_description' : 'generate_description')"
        >
          {{ hasDescription ? 'Mejorar descripción' : 'Generar descripción' }}
        </BaseButton>
        <BaseButton v-if="hasDescription" variant="secondary" size="sm" :disabled="busy" @click="run('fix_spelling')">
          Corregir ortografía
        </BaseButton>
        <div v-if="hasDescription" class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <label for="assist-tone" class="mb-1 block text-[12px] font-medium text-lumia-ink/70">Tono</label>
            <BaseSelect id="assist-tone" v-model="tone" :options="TONE_OPTIONS" :disabled="busy" />
          </div>
          <BaseButton variant="secondary" size="sm" :disabled="busy" @click="run('change_tone')">Cambiar tono</BaseButton>
        </div>
      </div>

      <p v-if="error" role="alert" class="rounded-xl bg-status-danger-soft px-3 py-2 text-[12px] text-status-danger">{{ error }}</p>

      <div v-if="busy" class="flex items-center gap-2 text-[13px] text-lumia-ink/65" role="status">
        <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
        Lumi está preparando una sugerencia…
      </div>

      <section
        v-if="suggestion && !busy"
        aria-live="polite"
        class="rounded-xl border border-lumia-gold/40 bg-lumia-cream/40 p-3.5"
      >
        <p class="text-[11px] font-medium uppercase tracking-[0.12em] text-lumia-ink/55">{{ suggestionLabel }}</p>
        <p class="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-lumia-ink">{{ suggestion.text }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton size="sm" @click="apply">Aplicar al formulario</BaseButton>
          <BaseButton size="sm" variant="secondary" @click="regenerate">Regenerar</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="suggestion = null">Descartar</BaseButton>
        </div>
        <p class="mt-2 text-[11px] text-lumia-ink/55">Solo se guarda si confirmas con «Guardar cambios».</p>
      </section>

      <section class="border-t border-lumia-ink/[0.06] pt-4" aria-labelledby="assist-seo-title">
        <h3 id="assist-seo-title" class="text-[13px] font-medium text-lumia-ink">SEO (solo copiar)</h3>
        <p class="mt-1 text-[11px] leading-relaxed text-lumia-ink/55">
          El catálogo todavía no guarda título SEO ni meta descripción. Copia la sugerencia y úsala donde corresponda.
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <BaseButton variant="secondary" size="sm" :disabled="busy" @click="runSeo('seo_title')">Título SEO</BaseButton>
          <BaseButton variant="secondary" size="sm" :disabled="busy" @click="runSeo('meta_description')">Meta descripción</BaseButton>
        </div>
        <div v-if="seo" class="mt-3 rounded-xl border border-lumia-ink/10 bg-white p-3">
          <p class="text-[11px] text-lumia-ink/55">{{ seo.kind === 'seo_title' ? 'Título SEO' : 'Meta descripción' }} · {{ seo.text.length }} caracteres</p>
          <p class="mt-1.5 break-words text-[13px] text-lumia-ink">{{ seo.text }}</p>
          <BaseButton class="mt-2" size="sm" variant="ghost" @click="copySeo">Copiar</BaseButton>
        </div>
      </section>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

/**
 * Asistencia de contenido para el formulario de producto. Cada sugerencia se aplica solo cuando
 * el administrador lo pide; el campo sigue siendo editable y la guarda el formulario existente.
 */

type Action =
  | 'generate_title'
  | 'generate_description'
  | 'improve_description'
  | 'fix_spelling'
  | 'change_tone'
type Tone = 'commercial' | 'friendly' | 'formal'
type Target = 'name' | 'description'

const props = defineProps<{
  productId: string
  fields: {
    name: Ref<string | undefined>
    description: Ref<string | undefined>
    subcategoryId: Ref<string | undefined>
    brand: Ref<string | undefined>
    taxRate: Ref<string | undefined>
  }
}>()

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'commercial', label: 'Comercial y persuasivo' },
  { value: 'friendly', label: 'Cercano y amable' },
  { value: 'formal', label: 'Formal y sobrio' },
]

const { request } = useAdminApi()
const { confirm } = useConfirm()
const toast = useToast()

const busy = ref(false)
const error = ref<string | null>(null)
const tone = ref<Tone>('commercial')
const suggestion = ref<{ action: Action; target: Target; text: string } | null>(null)
const seo = ref<{ kind: 'seo_title' | 'meta_description'; text: string } | null>(null)

const hasDescription = computed(() => (props.fields.description.value ?? '').trim().length > 0)

const missing = computed(() => {
  const list: string[] = []
  if (!hasDescription.value) list.push('descripción')
  if (!props.fields.subcategoryId.value) list.push('subcategoría')
  if (!props.fields.brand.value) list.push('marca')
  if (!props.fields.taxRate.value) list.push('IVA')
  return list
})

const suggestionLabel = computed(() => {
  if (!suggestion.value) return ''
  return suggestion.value.target === 'name' ? 'Título sugerido' : 'Descripción sugerida'
})

function errorText(e: unknown): string {
  return toUiError(e).message || 'No se pudo obtener la sugerencia.'
}

async function ask(action: string, extra: Record<string, unknown> = {}): Promise<string> {
  const source = action === 'generate_title' ? props.fields.name.value : props.fields.description.value
  const text = source?.trim()
  const res = await request<{ action: string; text: string }>(`/api/admin/lumi/products/${props.productId}/assist`, {
    method: 'POST',
    body: { action, ...(text ? { text } : {}), ...extra },
  })
  return res.text
}

async function run(action: Action) {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    const text = await ask(action, action === 'change_tone' ? { tone: tone.value } : {})
    suggestion.value = { action, target: action === 'generate_title' ? 'name' : 'description', text }
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}

async function runSeo(kind: 'seo_title' | 'meta_description') {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    seo.value = { kind, text: await ask(kind) }
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}

async function regenerate() {
  if (!suggestion.value) return
  await run(suggestion.value.action)
}

/** Reemplazar un texto existente exige confirmación: nunca se sustituye en silencio. */
async function apply() {
  const s = suggestion.value
  if (!s) return
  const current = (props.fields[s.target].value ?? '').trim()
  if (current && current !== s.text) {
    const ok = await confirm({
      title: 'Reemplazar el contenido actual',
      description: 'La sugerencia sustituirá el texto del campo. Podrás revisarlo antes de guardar.',
      confirmLabel: 'Reemplazar',
    })
    if (!ok) return
  }
  props.fields[s.target].value = s.text
  suggestion.value = null
  toast.success('Sugerencia aplicada', 'Revísala y pulsa «Guardar cambios» para guardarla.')
}

async function copySeo() {
  if (!seo.value) return
  try {
    await navigator.clipboard.writeText(seo.value.text)
    toast.success('Copiado al portapapeles')
  } catch {
    toast.error('No se pudo copiar', 'Selecciona el texto y cópialo manualmente.')
  }
}
</script>
