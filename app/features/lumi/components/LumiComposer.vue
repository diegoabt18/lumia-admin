<template>
  <form class="shrink-0 border-t border-lumia-ink/[0.06] bg-white p-3" @submit.prevent="submit">
    <div class="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Opciones de respuesta">
      <span class="text-[11px] font-medium text-lumia-ink/55">Razonamiento</span>
      <button
        v-for="option in REASONING_OPTIONS"
        :key="option.value"
        type="button"
        :class="chipClass(lumi.reasoningMode.value === option.value)"
        :aria-pressed="lumi.reasoningMode.value === option.value ? 'true' : 'false'"
        @click="setReasoning(option.value)"
      >
        {{ option.label }}
      </button>
      <span class="ml-1 text-[11px] font-medium text-lumia-ink/55">Longitud</span>
      <button
        v-for="length in LUMI_RESPONSE_LENGTHS"
        :key="length.value"
        type="button"
        class="rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
        :class="lumi.maxTokens.value === length.value ? 'border-lumia-ink bg-lumia-ink text-lumia-cream' : 'border-lumia-ink/15 bg-white text-lumia-ink/75 hover:bg-lumia-beige/40'"
        :aria-pressed="lumi.maxTokens.value === length.value ? 'true' : 'false'"
        @click="lumi.maxTokens.value = length.value"
      >
        {{ length.label }}
      </button>
      <p v-if="lumi.reasoningMode.value === 'on' || lumi.maxTokens.value > LUMI_RESPONSE_LENGTHS[0].value" class="w-full text-[11px] leading-snug text-lumia-ink/60">
        Las respuestas con razonamiento o más largas tardan más en aparecer.
      </p>
    </div>
    <div v-if="canUseWeb" class="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Búsqueda web">
      <span class="text-[11px] font-medium text-lumia-ink/55">Búsqueda web</span>
      <button
        v-for="option in WEB_OPTIONS"
        :key="option.value"
        type="button"
        :class="chipClass(lumi.webMode.value === option.value)"
        :aria-pressed="lumi.webMode.value === option.value ? 'true' : 'false'"
        @click="lumi.webMode.value = option.value"
      >
        {{ option.label }}
      </button>
      <p v-if="lumi.webMode.value !== 'off'" class="w-full text-[11px] leading-snug text-lumia-ink/60">
        Si se usa, solo tu pregunta sale a internet. No se consultan datos de la tienda.
      </p>
    </div>
    <label for="lumi-input" class="sr-only">Mensaje para Lumi</label>
    <div class="flex items-end gap-2">
      <textarea
        id="lumi-input"
        v-model="lumi.draft.value"
        rows="2"
        :maxlength="LUMI_MESSAGE_MAX"
        placeholder="Escribe un mensaje…"
        class="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-lumia-ink/15 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-ink placeholder:text-lumia-ink/40 focus:border-lumia-gold/60 focus:outline-none focus:ring-2 focus:ring-lumia-gold/20"
        :aria-describedby="showCounter ? 'lumi-counter' : undefined"
        @keydown="onKeydown"
      />
      <button
        v-if="lumi.sending.value"
        type="button"
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lumia-ink/20 bg-white text-lumia-ink shadow-soft transition-opacity hover:bg-lumia-beige/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
        aria-label="Detener la respuesta"
        title="Detener"
        @click="lumi.stop()"
      >
        <IconPlayerStop class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
      </button>
      <button
        v-else
        type="submit"
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lumia-ink text-lumia-cream shadow-soft transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canSend"
        aria-label="Enviar mensaje"
        title="Enviar (Enter)"
      >
        <IconSend class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <p v-if="showCounter" id="lumi-counter" class="mt-1.5 text-right text-[11px] text-lumia-ink/55">
      {{ lumi.draft.value.length }}/{{ LUMI_MESSAGE_MAX }}
    </p>
  </form>
</template>

<script setup lang="ts">
import { IconPlayerStop, IconSend } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { LUMI_MESSAGE_MAX, LUMI_RESPONSE_LENGTHS } from '#shared/schemas/lumi'
import type { LumiMode } from '~/features/lumi/composables/useLumi'

const REASONING_OPTIONS = [
  { value: 'auto', label: 'Automático' },
  { value: 'on', label: 'Activado' },
  { value: 'off', label: 'Desactivado' },
] as const satisfies ReadonlyArray<{ value: LumiMode; label: string }>

const WEB_OPTIONS = [
  { value: 'auto', label: 'Automática' },
  { value: 'on', label: 'Activada' },
  { value: 'off', label: 'Desactivada' },
] as const satisfies ReadonlyArray<{ value: LumiMode; label: string }>

const lumi = useLumi()
const auth = useAuth()
const canUseWeb = computed(() => auth.can(PERMISSIONS.LUMI_WEB))

const showCounter = computed(() => lumi.draft.value.length > LUMI_MESSAGE_MAX * 0.75)
const canSend = computed(() => !lumi.sending.value && lumi.draft.value.trim().length > 0)

const LONGEST_LENGTH = LUMI_RESPONSE_LENGTHS.reduce((max, length) => Math.max(max, length.value), 0)

/** Con razonamiento activado, la respuesta necesita margen: se pasa a la longitud más larga. */
function setReasoning(mode: LumiMode) {
  lumi.reasoningMode.value = mode
  if (mode === 'on') lumi.maxTokens.value = LONGEST_LENGTH
}

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70 ${active ? 'border-lumia-ink bg-lumia-ink text-lumia-cream' : 'border-lumia-ink/15 bg-white text-lumia-ink/75 hover:bg-lumia-beige/40'}`
}

function submit() {
  if (!canSend.value) return
  void lumi.send()
}

/** Enter envía; Shift+Enter inserta salto de línea. Respeta la composición de IME. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}

onMounted(() => {
  document.getElementById('lumi-input')?.focus()
})
</script>
