<template>
  <div class="fixed z-40" :style="position.style.value">
    <button
      type="button"
      class="group relative inline-flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-lumia-ink text-lumia-cream shadow-soft-lg transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
      :class="position.dragging.value ? 'cursor-grabbing' : 'cursor-grab'"
      :aria-label="lumi.open.value ? 'Cerrar Lumi' : 'Abrir Lumi, asistente de administración'"
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
    </button>

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
