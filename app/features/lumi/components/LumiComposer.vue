<template>
  <form class="shrink-0 border-t border-lumia-ink/[0.06] bg-white p-3" @submit.prevent="submit">
    <div class="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Opciones de respuesta">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
        :class="lumi.think.value ? 'border-lumia-ink bg-lumia-ink text-lumia-cream' : 'border-lumia-ink/15 bg-white text-lumia-ink/75 hover:bg-lumia-beige/40'"
        :aria-pressed="lumi.think.value ? 'true' : 'false'"
        @click="lumi.think.value = !lumi.think.value"
      >
        <IconBrain class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
        {{ lumi.think.value ? 'Con razonamiento' : 'Sin razonamiento' }}
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
      <p v-if="lumi.think.value || lumi.maxTokens.value > LUMI_RESPONSE_LENGTHS[0].value" class="w-full text-[11px] leading-snug text-lumia-ink/60">
        Las respuestas con razonamiento o más largas tardan más en aparecer.
      </p>
    </div>
    <div v-if="canUseWeb" class="mb-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
        :class="lumi.webMode.value ? 'border-lumia-ink bg-lumia-ink text-lumia-cream' : 'border-lumia-ink/15 bg-white text-lumia-ink/75 hover:bg-lumia-beige/40'"
        :aria-pressed="lumi.webMode.value ? 'true' : 'false'"
        @click="lumi.webMode.value = !lumi.webMode.value"
      >
        <IconWorldSearch class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
        {{ lumi.webMode.value ? 'Chat + búsqueda web' : 'Solo chat' }}
      </button>
      <p v-if="lumi.webMode.value" class="text-[11px] leading-snug text-lumia-ink/60">
        Solo tu pregunta sale a internet. No se consultan datos de la tienda.
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
import { IconBrain, IconPlayerStop, IconSend, IconWorldSearch } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { LUMI_MESSAGE_MAX, LUMI_RESPONSE_LENGTHS } from '#shared/schemas/lumi'

const lumi = useLumi()
const auth = useAuth()
const canUseWeb = computed(() => auth.can(PERMISSIONS.LUMI_WEB))

const showCounter = computed(() => lumi.draft.value.length > LUMI_MESSAGE_MAX * 0.75)
const canSend = computed(() => !lumi.sending.value && lumi.draft.value.trim().length > 0)

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
