<template>
  <div class="fixed z-40" :style="position.style.value">
    <button
      type="button"
      class="group relative inline-flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-lumia-ink text-lumia-cream shadow-soft-lg transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
      :class="position.dragging.value ? 'cursor-grabbing' : 'cursor-grab'"
      :aria-label="launcherLabel"
      :aria-expanded="lumi.open.value"
      :aria-controls="lumi.open.value ? 'lumi-panel' : undefined"
      aria-describedby="lumi-launcher-tip"
      @pointerdown="position.onPointerDown"
      @pointermove="position.onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onClick"
      @keydown="onKeydown"
    >
      <IconSparkles class="h-6 w-6" stroke-width="1.6" aria-hidden="true" />

      <span
        v-if="lumi.sending.value"
        class="pointer-events-none absolute inset-0 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent"
        aria-hidden="true"
      />
      <span
        v-if="lumi.connection.value === 'error' && !lumi.sending.value"
        class="pointer-events-none absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-status-danger ring-2 ring-lumia-cream"
        aria-hidden="true"
      />
      <span
        v-if="reviews.pendingCount.value > 0"
        class="pointer-events-none absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-lumia-cream"
        aria-hidden="true"
      >
        {{ reviews.pendingCount.value > 9 ? '9+' : reviews.pendingCount.value }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="reviews.bubbleVisible.value"
        class="absolute bottom-full right-0 mb-3 w-64 rounded-2xl border border-lumia-ink/10 bg-white p-4 shadow-soft-lg"
        role="status"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-lumia-gold">Lumi</p>
        <p class="mt-1.5 text-[13px] leading-snug text-lumia-ink">
          Tienes {{ reviews.pendingCount.value }} {{ reviews.pendingCount.value === 1 ? 'tarea pendiente' : 'tareas pendientes' }} por revisar. ¿Quieres que te las muestre?
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-xl bg-lumia-ink px-3 py-1.5 text-[12px] font-semibold text-lumia-cream hover:bg-lumia-ink/90"
            @click="reviews.openReviews()"
          >
            Mostrar
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-1.5 text-[12px] font-medium text-lumia-ink/70 hover:bg-lumia-beige/50 hover:text-lumia-ink"
            @click="reviews.dismiss()"
          >
            Más tarde
          </button>
        </div>
      </div>
    </Transition>

    <span
      id="lumi-launcher-tip"
      role="tooltip"
      class="pointer-events-none absolute bottom-1/2 right-full mr-3 hidden translate-y-1/2 whitespace-nowrap rounded-lg bg-lumia-ink px-2.5 py-1 text-[12px] font-medium text-lumia-cream shadow-soft group-hover:block group-focus-visible:block"
      :class="{ '!hidden': position.dragging.value }"
    >
      {{ lumi.sending.value ? 'Lumi está respondiendo…' : 'Lumi · Asistente' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { IconSparkles } from '@tabler/icons-vue'

const lumi = useLumi()
const position = useLumiPosition()
const reviews = useLumiReviews()

const launcherLabel = computed(() => {
  if (lumi.open.value) return 'Cerrar Lumi'
  const pending = reviews.pendingCount.value
  const base = 'Abrir Lumi, asistente de administración'
  return pending > 0 ? `${base}, ${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}` : base
})

/** Tras un arrastre el navegador dispara un clic: se ignora para no abrir el panel. */
let suppressClick = false

function onPointerUp(event: PointerEvent) {
  const wasDrag = position.onPointerUp(event)
  if (wasDrag) {
    suppressClick = true
    window.setTimeout(() => {
      suppressClick = false
    }, 300)
  }
}

function onClick() {
  if (suppressClick) {
    suppressClick = false
    return
  }
  lumi.toggleOpen()
}

function onKeydown(event: KeyboardEvent) {
  const moves: Record<string, 'up' | 'down' | 'left' | 'right'> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  }
  const direction = moves[event.key]
  if (!direction) return
  event.preventDefault()
  position.nudge(direction)
}
</script>
