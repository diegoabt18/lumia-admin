<template>
  <form class="shrink-0 border-t border-lumia-ink/[0.06] bg-white p-3" @submit.prevent="submit">
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
import { LUMI_MESSAGE_MAX } from '#shared/schemas/lumi'

const lumi = useLumi()

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
