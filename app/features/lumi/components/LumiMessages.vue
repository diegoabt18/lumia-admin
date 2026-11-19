<template>
  <div ref="scroller" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
    <!-- Música sonando en el servidor sin un mensaje de música en esta conversación (p. ej. al reabrir el chat). -->
    <div v-if="showPinnedPlayer" class="space-y-1.5">
      <p class="lumia-eyebrow flex items-center gap-1.5 text-[10px]">
        <IconMusic class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
        Sonando ahora
      </p>
      <LumiMusicPlayer />
    </div>

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
      <li v-for="(message, index) in lumi.messages.value" :key="message.key" class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <div v-if="message.role === 'user'" class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-lumia-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-cream">
          <span class="sr-only">Tú: </span>{{ message.content }}
        </div>

        <div
          v-else-if="message.state === 'pending'"
          class="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-lumia-ink/10 bg-white px-3.5 py-2.5 text-[13px] text-lumia-ink/65"
          role="status"
        >
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
          {{ stageLabel(message) }}
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

        <!-- Respuesta de música: el texto confirmado por el reproductor y, si es la última, el reproductor en vivo. -->
        <div v-else-if="message.music && message.key === liveMusicKey" class="flex w-full max-w-[24rem] flex-col gap-2">
          <div class="rounded-2xl rounded-bl-md border border-lumia-ink/10 bg-white px-3.5 py-2 text-[13px] leading-relaxed text-lumia-ink/80">
            <p class="mb-1 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70">
              <IconMusic class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
              Música
            </p>
            <p class="whitespace-pre-wrap break-words"><span class="sr-only">Lumi: </span>{{ message.content }}</p>
            <LumiFeedback
              v-if="questionFor(index)"
              :question="questionFor(index)!"
              :conversation-id="lumi.conversationId.value"
            />
          </div>
          <LumiMusicPlayer />
        </div>

        <div v-else class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-lumia-ink/10 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-lumia-ink">
          <p
            v-if="message.tool"
            class="mb-1.5 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70"
          >
            <IconMusic v-if="isMusicTool(message.tool)" class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
            <IconDatabase v-else class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
            {{ toolBadge(message.tool) }}
          </p>
          <p
            v-if="message.webSearch"
            class="mb-1.5 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70"
          >
            Búsqueda web
          </p>
          <p
            v-if="message.reasoning"
            class="mb-1.5 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70"
          >
            Razonamiento
          </p>
          <p
            v-if="message.state === 'streaming'"
            class="mb-1.5 flex items-center gap-2 text-[12px] text-lumia-ink/65"
            role="status"
          >
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
            {{ stageLabel(message) }}
          </p>
          <details v-if="message.thinking" class="mb-2 whitespace-normal rounded-lg bg-lumia-cream/60 px-2.5 py-1.5 text-[12px] text-lumia-ink/70">
            <summary class="cursor-pointer select-none font-medium text-lumia-ink/75">
              {{ message.state === 'streaming' && !message.content ? 'Proceso de razonamiento en curso' : 'Ver proceso de razonamiento' }}
            </summary>
            <p class="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{{ message.thinking }}</p>
          </details>
          <span class="sr-only">Lumi: </span><LumiReferenceRenderer
            :content="message.content"
            :references="message.state === 'done' ? (message.references ?? []) : []"
          />
          <span
            v-if="message.state === 'streaming'"
            class="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-lumia-gold align-middle"
            aria-hidden="true"
          />
          <LumiFeedback
            v-if="message.state === 'done' && questionFor(index)"
            class="whitespace-normal"
            :question="questionFor(index)!"
            :conversation-id="lumi.conversationId.value"
          />
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { IconDatabase, IconMusic, IconRefresh } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { LUMI_MUSIC_PROMPT, lumiQuickPrompts } from '~/features/lumi/utils/context'

/**
 * Lista de mensajes. El contenido se muestra como texto (nunca como HTML): las respuestas del
 * modelo no son de confianza. Sin renderizado de Markdown por ahora.
 */
const auth = useAuth()
// La música solo se sugiere a quien puede controlarla (el Server vuelve a comprobarlo).
const prompts = computed(() => {
  const base = lumiQuickPrompts(lumi.pageContext.value)
  return auth.can(PERMISSIONS.MUSIC_CONTROL) ? [...base, LUMI_MUSIC_PROMPT] : base
})

const lumi = useLumi()
const music = useLumiMusic()
const scroller = ref<HTMLElement | null>(null)

/** Último mensaje de música terminado: solo ese muestra el reproductor en vivo (los anteriores, su texto). */
const liveMusicKey = computed(() => {
  const list = lumi.messages.value
  for (let i = list.length - 1; i >= 0; i--) {
    const message = list[i]!
    if (message.music && message.state === 'done') return message.key
  }
  return null
})

/** Reproductor fijo arriba: hay música activa en el servidor y esta conversación no la muestra. */
const showPinnedPlayer = computed(() => music.canRead.value && music.active.value && liveMusicKey.value === null)

// Al abrir el chat se consulta una vez el estado real (la música sigue en el servidor aunque se cierre).
onMounted(() => {
  if (music.canRead.value) void music.refresh()
})

/**
 * Etapa visible según lo que ha llegado del stream. Son estados reales, no frases que escriba el
 * modelo: no inventan progreso ni cuestan tokens.
 */
function stageLabel(message: { content: string; thinking?: string; tool?: { label: string } }): string {
  if (message.content) return 'Redactando respuesta…'
  if (message.tool && !message.thinking) return `${message.tool.label}…`
  if (message.thinking) return 'Analizando tu mensaje…'
  return 'Preparando respuesta…'
}

function isMusicTool(tool: { name?: string }): boolean {
  return tool.name?.startsWith('music.') === true
}

/** Etiqueta de los datos consultados: es un hecho del Server, no una frase del modelo. */
function toolBadge(tool: { name?: string; label: string; rows: number; denied: boolean }): string {
  if (isMusicTool(tool)) return tool.denied ? 'Música sin permiso' : 'Música'
  if (tool.denied) return 'Consulta sin permiso'
  const rows = tool.rows === 1 ? '1 resultado' : `${tool.rows} resultados`
  return `Datos de Lumia · ${rows}`
}

/** Pregunta del usuario a la que responde el mensaje `index` (para «No era esto»). */
function questionFor(index: number): string | null {
  const previous = lumi.messages.value[index - 1]
  const text = previous?.role === 'user' ? previous.content.trim() : ''
  // Ni «sí»/«no» ni una corrección («no, me refiero a…») son preguntas que enseñar.
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (text.length < 2 || NOT_A_QUESTION.test(plain)) return null
  return text
}
const NOT_A_QUESTION = /^(?:si|no|ok|vale|dale|claro|gracias|cancelar)\b.{0,12}$|^(?:no,?\s+)?(?:me refiero a|me referia a|quise decir|queria decir)\b/

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
