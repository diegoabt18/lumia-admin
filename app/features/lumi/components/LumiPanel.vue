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
          v-if="lumi.view.value === 'chat'"
          type="button"
          class="panel-icon-btn inline-flex"
          aria-label="Ver historial de conversaciones"
          title="Historial"
          @click="showHistory"
        >
          <IconHistory class="h-[18px] w-[18px]" stroke-width="1.75" aria-hidden="true" />
        </button>
        <button type="button" class="panel-icon-btn inline-flex" aria-label="Nueva conversación" title="Nueva conversación" :disabled="lumi.sending.value" @click="lumi.newChat()">
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

      <div v-show="!lumi.minimized.value" class="flex min-h-0 flex-1 flex-col">
        <LumiHistory v-if="lumi.view.value === 'history'" @back="lumi.view.value = 'chat'" />

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
  IconPlus,
  IconSparkles,
  IconX,
} from '@tabler/icons-vue'

const lumi = useLumi()
const position = useLumiPosition()

const contextLabel = computed(() => (lumi.pageContext.value ? lumiContextLabel(lumi.pageContext.value) : ''))

const footerText = computed(() => {
  if (!lumi.pageContext.value) return 'Lumi todavía no consulta los datos de la tienda: verifica cualquier cifra o dato antes de usarlo.'
  if (!lumi.pageContextEnabled.value) return 'El contexto de pantalla está desactivado: Lumi no usa los datos de esta vista.'
  return 'Lumi usa solo los datos de esta pantalla. Verifica cualquier cifra antes de usarla.'
})

const statusLabel = computed(() => {
  if (lumi.view.value === 'history') return 'Historial de conversaciones'
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
.panel-icon-btn {
  @apply h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lumia-ink/60 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
