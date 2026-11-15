<template>
  <div class="mt-1.5">
    <p v-if="result" class="text-[11px] text-lumia-ink/55" role="status">{{ result }}</p>

    <button
      v-else-if="!open"
      type="button"
      class="text-[11px] font-medium text-lumia-ink/45 underline decoration-lumia-ink/20 underline-offset-2 hover:text-lumia-ink/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
      @click="start"
    >
      No era esto
    </button>

    <form v-else novalidate class="mt-1 space-y-2.5 rounded-xl border border-lumia-ink/10 bg-white p-3 text-[12px]" @submit.prevent="submit">
      <fieldset>
        <legend class="mb-1.5 font-medium text-lumia-ink/80">¿Qué querías con «{{ shortQuestion }}»?</legend>
        <p v-if="loading" class="text-lumia-ink/55">Cargando opciones…</p>
        <p v-else-if="loadError" class="text-status-danger">{{ loadError }}</p>
        <div v-else class="max-h-44 space-y-1 overflow-y-auto pr-1">
          <label v-for="option in options" :key="option.tool" class="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-lumia-cream/60">
            <input v-model="choice" type="radio" :name="`lumi-fb-${uid}`" :value="option.tool" class="mt-0.5 accent-lumia-gold" :disabled="busy" />
            <span class="text-lumia-ink/80">{{ option.label }}</span>
          </label>
          <label class="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-lumia-cream/60">
            <input v-model="choice" type="radio" :name="`lumi-fb-${uid}`" value="__other" class="mt-0.5 accent-lumia-gold" :disabled="busy" />
            <span class="text-lumia-ink/80">Otra cosa</span>
          </label>
        </div>
      </fieldset>
      <div v-if="choice === '__other'">
        <label :for="`lumi-fb-wanted-${uid}`" class="sr-only">Qué querías</label>
        <input
          :id="`lumi-fb-wanted-${uid}`"
          v-model="wanted"
          type="text"
          maxlength="300"
          placeholder="Escribe lo que querías ver"
          class="w-full rounded-lg border border-lumia-ink/15 px-2.5 py-1.5 text-[12px] text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/60"
          :disabled="busy"
        />
      </div>
      <p class="text-[11px] text-lumia-ink/50">Solo se aplica a tus próximas preguntas. No cambia tus permisos.</p>
      <p v-if="error" role="alert" class="text-status-danger">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg px-2.5 py-1 text-lumia-ink/60 hover:text-lumia-ink" :disabled="busy" @click="open = false">Cancelar</button>
        <button type="submit" class="rounded-lg bg-lumia-ink px-3 py-1 font-medium text-lumia-cream disabled:opacity-50" :disabled="busy || !canSubmit">Guardar</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { feedbackOptionsResponseSchema, feedbackResponseSchema, type FeedbackOption } from '#shared/schemas/lumi-learning'

/**
 * «No era esto» (fase F): el usuario enseña qué consulta quería para su propia pregunta. El Server
 * solo acepta consultas que ya puede usar; «Otra cosa» se registra como capacidad que falta.
 */
const props = defineProps<{ question: string; conversationId: string | null }>()

const { request } = useAdminApi()
const uid = useId()
const open = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)
const options = ref<FeedbackOption[]>([])
const choice = ref('')
const wanted = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const result = ref<string | null>(null)

const shortQuestion = computed(() => (props.question.length > 60 ? `${props.question.slice(0, 59)}…` : props.question))
const canSubmit = computed(() => (choice.value === '__other' ? wanted.value.trim().length >= 3 : Boolean(choice.value)))

async function start() {
  open.value = true
  if (options.value.length || loading.value) return
  loading.value = true
  loadError.value = null
  try {
    options.value = feedbackOptionsResponseSchema.parse(await request<unknown>('/api/admin/lumi/feedback/options')).items
  } catch (e) {
    loadError.value = toUiError(e).message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!canSubmit.value || busy.value) return
  busy.value = true
  error.value = null
  const body = {
    message: props.question.slice(0, 300),
    ...(props.conversationId ? { conversationId: props.conversationId } : {}),
    ...(choice.value === '__other' ? { wanted: wanted.value.trim() } : { tool: choice.value }),
  }
  try {
    const res = feedbackResponseSchema.parse(await request<unknown>('/api/admin/lumi/feedback', { method: 'POST', body }))
    if (res.saved === 'interpretation') {
      const label = options.value.find((o) => o.tool === res.tool)?.label ?? res.tool
      result.value = `Guardado: la próxima vez usaré «${label}».`
    } else {
      result.value = res.registered ? 'Anotado como algo que Lumi todavía no sabe hacer.' : 'Gracias. No se pudo registrar ahora.'
    }
    open.value = false
  } catch (e) {
    error.value = toUiError(e).message
  } finally {
    busy.value = false
  }
}
</script>
