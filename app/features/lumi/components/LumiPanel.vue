<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <section
      v-if="lumi.open.value"
      id="lumi-panel"
      role="dialog"
      aria-labelledby="lumi-title"
      class="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-lumia-ink/10 bg-white shadow-soft-lg"
      :class="panelClasses"
      :style="panelStyle"
    >
      <header class="flex shrink-0 items-center gap-2 border-b border-lumia-ink/[0.06] px-4 py-3">
        <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lumia-cream text-lumia-ink" aria-hidden="true">
          <IconSparkles class="h-[18px] w-[18px]" stroke-width="1.6" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="lumi-title" class="font-display text-[18px] leading-tight text-lumia-ink">Lumi</h2>
          <p class="truncate text-[11px] text-lumia-ink/55" role="status" aria-live="polite">{{ statusLabel }}</p>
        </div>

        <button
          v-if="lumi.view.value === 'chat' && !musicTab"
          type="button"
          class="panel-icon-btn inline-flex"
          aria-label="Ver historial de conversaciones"
          title="Historial"
          @click="showHistory"
        >
          <IconHistory class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
        <button v-if="!musicTab" type="button" class="panel-icon-btn inline-flex" aria-label="Nueva conversación" title="Nueva conversación" :disabled="lumi.sending.value" @click="lumi.newChat()">
          <IconPlus class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="panel-icon-btn hidden sm:inline-flex"
          :aria-label="lumi.expanded.value ? 'Reducir panel' : 'Expandir panel'"
          :title="lumi.expanded.value ? 'Reducir' : 'Expandir'"
          @click="lumi.expanded.value = !lumi.expanded.value"
        >
          <IconArrowsMaximize v-if="!lumi.expanded.value" class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
          <IconArrowsMinimize v-else class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="panel-icon-btn inline-flex"
          :aria-label="lumi.minimized.value ? 'Restaurar panel' : 'Minimizar panel'"
          :aria-expanded="!lumi.minimized.value"
          :title="lumi.minimized.value ? 'Restaurar' : 'Minimizar'"
          @click="lumi.minimized.value = !lumi.minimized.value"
        >
          <IconChevronDown v-if="!lumi.minimized.value" class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
          <IconChevronUp v-else class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
        <button type="button" class="panel-icon-btn inline-flex" aria-label="Cerrar Lumi" title="Cerrar" @click="lumi.close()">
          <IconX class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
      </header>

      <!-- Pestañas: Chat y Música (solo con permiso para ver la música). -->
      <div
        v-if="music.canRead.value && !lumi.minimized.value"
        class="flex shrink-0 gap-1 border-b border-lumia-ink/[0.06] px-3"
        role="tablist"
        aria-label="Secciones de Lumi"
      >
        <button
          v-for="item in TABS"
          :id="`lumi-tab-${item.key}`"
          :key="item.key"
          type="button"
          role="tab"
          class="relative inline-flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumia-gold/70"
          :class="music.tab.value === item.key ? 'text-lumia-ink' : 'text-lumia-ink/55 hover:text-lumia-ink'"
          :aria-selected="music.tab.value === item.key ? 'true' : 'false'"
          aria-controls="lumi-tab-panel"
          :tabindex="music.tab.value === item.key ? 0 : -1"
          @click="music.tab.value = item.key"
          @keydown.right.prevent="switchTab"
          @keydown.left.prevent="switchTab"
        >
          <component :is="item.icon" class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          {{ item.label }}
          <!-- Indicador: hay música sonando en el servidor. -->
          <span v-if="item.key === 'music' && music.playing.value" class="lumi-tab-eq flex h-3 items-end gap-[2px]" aria-hidden="true">
            <span v-for="bar in 3" :key="bar" class="lumi-tab-eq-bar w-[2px] rounded-full bg-lumia-gold" />
          </span>
          <span v-if="item.key === 'music' && music.playing.value" class="sr-only">(sonando)</span>
          <span
            v-if="music.tab.value === item.key"
            class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lumia-ink"
            aria-hidden="true"
          />
        </button>
      </div>

      <div v-show="!lumi.minimized.value" id="lumi-tab-panel" class="flex min-h-0 flex-1 flex-col" :role="music.canRead.value ? 'tabpanel' : undefined" :aria-labelledby="music.canRead.value ? `lumi-tab-${music.tab.value}` : undefined">
        <LumiMusicCenter v-if="musicTab" />
        <LumiHistory v-else-if="lumi.view.value === 'history'" @back="lumi.view.value = 'chat'" />
        <LumiReviews v-else-if="lumi.view.value === 'review'" @back="lumi.view.value = 'chat'" />

        <template v-else>
          <div
            v-if="lumi.pageContext.value"
            class="flex shrink-0 items-center justify-between gap-3 border-b border-lumia-ink/[0.06] bg-lumia-cream/40 px-4 py-1.5 text-[12px]"
          >
            <p class="min-w-0 truncate" :class="lumi.pageContextEnabled.value ? 'text-lumia-ink/70' : 'text-lumia-ink/40 line-through'">
              <span class="font-medium text-lumia-ink">Contexto:</span> {{ contextLabel }}
            </p>
            <label class="inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-lumia-ink/70">
              <input
                v-model="lumi.pageContextEnabled.value"
                type="checkbox"
                class="h-3.5 w-3.5 cursor-pointer rounded border-lumia-ink/30 text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
              />
              Usar esta pantalla
            </label>
          </div>
          <LumiMessages />
          <p class="shrink-0 border-t border-lumia-ink/[0.06] bg-lumia-canvas/60 px-4 py-2 text-[11px] leading-snug text-lumia-ink/60">
            {{ footerText }}
          </p>
          <LumiComposer />
        </template>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { lumiContextLabel } from '~/features/lumi/utils/context'
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronDown,
  IconChevronUp,
  IconHistory,
  IconMessageCircle,
  IconMusic,
  IconPlus,
  IconSparkles,
  IconX,
} from '@tabler/icons-vue'

const lumi = useLumi()
const position = useLumiPosition()
const music = useLumiMusic()

const TABS = [
  { key: 'chat', label: 'Chat', icon: IconMessageCircle },
  { key: 'music', label: 'Música', icon: IconMusic },
] as const
const musicTab = computed(() => music.canRead.value && music.tab.value === 'music')

function switchTab() {
  music.tab.value = music.tab.value === 'chat' ? 'music' : 'chat'
  nextTick(() => document.getElementById(`lumi-tab-${music.tab.value}`)?.focus())
}

/*
 * Estado de la música en tiempo real solo mientras el panel está abierto: una conexión SSE por
 * pestaña. Al cerrarlo se cierra la conexión; la música sigue sonando en el servidor.
 */
let streaming = false
function syncMusicStream(on: boolean) {
  if (on && !streaming) music.attach()
  else if (!on && streaming) music.detach()
  streaming = on
}
onMounted(() => {
  syncMusicStream(lumi.open.value && music.canRead.value)
  watch(() => lumi.open.value && music.canRead.value, syncMusicStream)
})
onBeforeUnmount(() => syncMusicStream(false))

const contextLabel = computed(() => (lumi.pageContext.value ? lumiContextLabel(lumi.pageContext.value) : ''))

const footerText = computed(() => {
  if (!lumi.pageContext.value) return 'Lumi todavía no consulta los datos de la tienda: verifica cualquier cifra o dato antes de usarlo.'
  if (!lumi.pageContextEnabled.value) return 'El contexto de pantalla está desactivado: Lumi no usa los datos de esta vista.'
  return 'Lumi usa solo los datos de esta pantalla. Verifica cualquier cifra antes de usarla.'
})

const statusLabel = computed(() => {
  if (musicTab.value) return music.playing.value ? 'Sonando en el servidor' : 'Centro de música'
  if (lumi.view.value === 'history') return 'Historial de conversaciones'
  if (lumi.view.value === 'review') return 'Tareas pendientes por revisar'
  if (lumi.sending.value) return 'Lumi está respondiendo…'
  if (lumi.connection.value === 'error') return 'Sin conexión con Lumi'
  return 'Asistente de administración'
})

/** Ancho de la ventana: la posición junto al icono solo aplica en escritorio (>= 640 px). */
const viewportWidth = ref(0)
const isWide = computed(() => viewportWidth.value >= 640)

function syncViewport() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})
onBeforeUnmount(() => window.removeEventListener('resize', syncViewport))

/**
 * Escritorio: el panel se ancla junto al icono (mismo borde derecho, encima de él) y clamp()
 * lo mantiene dentro del viewport. Móvil: hoja a todo el ancho, definida solo por clases.
 */
const panelStyle = computed<Record<string, string> | undefined>(() => {
  if (!isWide.value) return undefined
  const width = lumi.expanded.value ? 560 : 400
  const height = lumi.expanded.value ? 'min(760px, calc(100vh - 80px))' : 'min(640px, calc(100vh - 140px))'
  const right = position.offset.value.right
  const bottom = position.offset.value.bottom + 64
  return {
    width: `${width}px`,
    height,
    right: `clamp(16px, calc(env(safe-area-inset-right, 0px) + ${right}px), calc(100vw - ${width + 16}px))`,
    bottom: `clamp(16px, calc(env(safe-area-inset-bottom, 0px) + ${bottom}px), calc(100vh - 16px - ${height}))`,
  }
})

const panelClasses = computed(() =>
  lumi.minimized.value
    ? 'left-2 right-2 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] h-auto sm:left-auto sm:right-auto'
    : 'left-2 right-2 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] h-[min(78vh,680px)] sm:left-auto sm:right-auto',
)

function showHistory() {
  // LumiHistory carga la lista al montarse.
  lumi.view.value = 'history'
}
</script>

<style scoped>
.lumi-tab-eq-bar {
  height: 40%;
  animation: lumi-tab-eq 0.9s ease-in-out infinite;
}
.lumi-tab-eq-bar:nth-child(2) {
  animation-delay: -0.3s;
}
.lumi-tab-eq-bar:nth-child(3) {
  animation-delay: -0.6s;
}
@keyframes lumi-tab-eq {
  0%,
  100% {
    height: 30%;
  }
  50% {
    height: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lumi-tab-eq-bar {
    animation: none;
    height: 70%;
  }
}
.panel-icon-btn {
  @apply h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lumia-ink/60 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
