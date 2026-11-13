<template>
  <div ref="scroller" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
    <div v-if="lumi.messages.value.length === 0" class="flex h-full flex-col justify-center gap-5 py-6">
      <div>
        <p class="font-display text-[22px] leading-tight text-lumia-ink">¿En qué te ayudo?</p>
        <p class="mt-1.5 text-[13px] leading-relaxed text-lumia-ink/65">
          {{ lumi.pageContext.value ? 'Puedo ayudarte con lo que se ve en esta pantalla. Solo conozco esos datos.' : 'Puedo redactar textos y responder dudas generales. Todavía no tengo acceso a pedidos, productos ni cifras de la tienda.' }}
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <button
          v-for="prompt in prompts"
          :key="prompt"
          type="button"
          class="rounded-xl border border-lumia-ink/10 bg-white px-3.5 py-2.5 text-left text-[13px] text-lumia-ink/80 transition-colors hover:border-lumia-gold/50 hover:bg-lumia-cream/60 hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
          @click="usePrompt(prompt)"
        >
          {{ prompt }}
        </button>
      </div>
    </div>

    <ol v-else class="space-y-4" aria-label="Conversación con Lumi">
      <li v-for="message in lumi.messages.value" :key="message.key" class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <div v-if="message.role === 'user'" class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-lumia-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-cream">
          <span class="sr-only">Tú: </span>{{ message.content }}
        </div>

        <div
          v-else-if="message.state === 'pending'"
          class="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-lumia-ink/10 bg-white px-3.5 py-2.5 text-[13px] text-lumia-ink/65"
          role="status"
        >
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
          Lumi está pensando…
        </div>

        <div
          v-else-if="message.state === 'failed'"
          class="max-w-[85%] rounded-2xl rounded-bl-md border border-status-danger/30 bg-status-danger-soft px-3.5 py-2.5 text-[13px] text-status-danger"
          role="alert"
        >
          <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
          <button
            type="button"
            class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-status-danger/30 bg-white px-2.5 py-1 text-[12px] font-medium text-status-danger hover:bg-status-danger-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:opacity-50"
            :disabled="lumi.sending.value"
            @click="lumi.retryLast()"
          >
            <IconRefresh class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
            Reintentar
          </button>
        </div>

        <div
          v-else-if="message.state === 'stopped'"
          class="max-w-[85%] rounded-2xl rounded-bl-md border border-dashed border-lumia-ink/20 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-ink"
        >
          <p v-if="message.content" class="whitespace-pre-wrap break-words">
            <span class="sr-only">Lumi: </span>{{ message.content }}
          </p>
          <p class="mt-1.5 text-[11px] text-lumia-ink/55" role="status">
            Respuesta detenida. No se guardó en el historial.
          </p>
        </div>

        <div v-else class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-lumia-ink/10 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-ink">
          <details v-if="message.thinking" class="mb-2 whitespace-normal rounded-lg bg-lumia-cream/60 px-2.5 py-1.5 text-[12px] text-lumia-ink/70">
            <summary class="cursor-pointer select-none font-medium text-lumia-ink/75">
              {{ message.state === 'streaming' && !message.content ? 'Razonando…' : 'Ver razonamiento' }}
            </summary>
            <p class="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{{ message.thinking }}</p>
          </details>
          <span class="sr-only">Lumi: </span>{{ message.content }}
          <span
            v-if="message.state === 'streaming'"
            class="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-lumia-gold align-middle"
            aria-hidden="true"
          />
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { IconRefresh } from '@tabler/icons-vue'
import { lumiQuickPrompts } from '~/features/lumi/utils/context'

/**
 * Lista de mensajes. El contenido se muestra como texto (nunca como HTML): las respuestas del
 * modelo no son de confianza. Sin renderizado de Markdown por ahora.
 */
const prompts = computed(() => lumiQuickPrompts(lumi.pageContext.value))

const lumi = useLumi()
const scroller = ref<HTMLElement | null>(null)

function usePrompt(prompt: string) {
  lumi.draft.value = prompt
  nextTick(() => document.getElementById('lumi-input')?.focus())
}

function scrollToEnd() {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(
  () => lumi.messages.value.map((m) => `${m.key}${m.state}${m.content.length}`).join('|'),
  () => nextTick(scrollToEnd),
)
onMounted(scrollToEnd)
</script>
