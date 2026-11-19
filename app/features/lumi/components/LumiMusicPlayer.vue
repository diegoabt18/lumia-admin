<template>
  <!-- Variante compacta: tarjeta del chat (estado real y acceso al centro de música). -->
  <section
    v-if="compact"
    class="lumi-player flex w-full items-center gap-2.5 rounded-2xl border border-lumia-ink/10 bg-white p-2 shadow-soft"
    aria-label="Música de Lumi"
  >
    <LumiMusicCover :src="track?.thumbnailUrl" class="h-11 w-11" rounded="rounded-xl">
      <span
        v-if="state?.status === 'playing'"
        class="lumi-eq absolute bottom-1 left-1 flex h-3 items-end gap-[2px] rounded bg-lumia-black/55 px-[3px] py-[2px]"
        aria-hidden="true"
      >
        <span v-for="bar in 3" :key="bar" class="lumi-eq-bar w-[2px] rounded-full bg-lumia-cream" />
      </span>
    </LumiMusicCover>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[13px] font-medium leading-tight text-lumia-ink">
        {{ track?.title ?? (music.available.value === false ? 'Música no disponible' : 'Sin música') }}
      </p>
      <p class="truncate text-[11.5px] text-lumia-ink/55" role="status" aria-live="polite">
        {{ statusMeta.label }}<span v-if="track?.artist"> · {{ track.artist }}</span>
      </p>
    </div>
    <button
      v-if="track && canControl"
      type="button"
      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lumia-ink text-lumia-cream transition-transform duration-150 hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      :disabled="busy || !primary.tool"
      :aria-label="primary.label"
      :title="primary.label"
      @click="onPrimary"
    >
      <IconLoader2 v-if="state?.status === 'loading' || busy" class="h-4 w-4 animate-spin" stroke-width="2" aria-hidden="true" />
      <IconPlayerPauseFilled v-else-if="state?.status === 'playing'" class="h-4 w-4" aria-hidden="true" />
      <IconPlayerPlayFilled v-else class="h-4 w-4 translate-x-[1px]" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-lumia-ink/75 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
      @click="music.openCenter()"
    >
      Abrir música
      <IconChevronRight class="h-3.5 w-3.5" stroke-width="2" aria-hidden="true" />
    </button>
  </section>

  <section
    v-else
    class="lumi-player w-full overflow-hidden rounded-2xl border border-lumia-ink/10 bg-white shadow-soft"
    aria-label="Reproductor de música de Lumi"
  >
    <!-- Sin música disponible (apagada en el servidor o sin conexión con el asistente). -->
    <div v-if="music.available.value === false" class="flex items-center gap-2.5 px-4 py-4 text-[13px] text-lumia-ink/65" role="status">
      <IconMusic class="h-4 w-4 shrink-0 text-lumia-ink/45" stroke-width="1.75" aria-hidden="true" />
      El reproductor de música no está disponible ahora mismo.
    </div>

    <div v-else-if="!state" class="flex items-center gap-2.5 px-4 py-4 text-[13px] text-lumia-ink/65" role="status">
      <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
      Consultando el reproductor…
    </div>

    <template v-else>
      <!-- Pista: portada destacada, estado, título, artista, álbum y fuente. -->
      <div class="flex gap-3.5 p-3.5">
        <LumiMusicCover :src="track?.thumbnailUrl" class="h-24 w-24 shadow-soft" rounded="rounded-2xl">
          <span
            v-if="state.status === 'playing'"
            class="lumi-eq absolute bottom-1.5 left-1.5 flex h-3.5 items-end gap-[2px] rounded-md bg-lumia-black/55 px-1 py-[3px]"
            aria-hidden="true"
          >
            <span v-for="bar in 3" :key="bar" class="lumi-eq-bar w-[3px] rounded-full bg-lumia-cream" />
          </span>
        </LumiMusicCover>

        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex items-center gap-1.5">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              :class="statusMeta.class"
              role="status"
              aria-live="polite"
            >
              <IconLoader2 v-if="state.status === 'loading'" class="h-3 w-3 animate-spin" stroke-width="2" aria-hidden="true" />
              {{ statusMeta.label }}
            </span>
            <a
              v-if="track?.url"
              :href="track.url"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-lumia-ink/55 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
              title="Abrir en YouTube"
            >
              <IconBrandYoutube class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
              YouTube
            </a>
          </div>

          <template v-if="track">
            <p class="mt-1.5 line-clamp-2 font-display text-[17px] leading-snug text-lumia-ink" :title="track.title">{{ track.title }}</p>
            <p v-if="track.artist" class="truncate text-[12.5px] text-lumia-ink/65">{{ track.artist }}</p>
            <p v-if="track.album" class="truncate text-[11px] text-lumia-ink/50">{{ track.album }}</p>
          </template>
          <p v-else class="mt-1.5 text-[13px] leading-snug text-lumia-ink/65">
            No hay ninguna canción cargada. Pídele a Lumi una canción o elige una en «Descubrir».
          </p>
        </div>
      </div>

      <!-- Progreso: barra interactiva (salta a una posición) y tiempos. -->
      <div v-if="track" class="px-3.5">
        <input
          type="range"
          class="lumi-range w-full"
          min="0"
          :max="duration || 1"
          step="1"
          :value="shownPosition"
          :disabled="!canSeek"
          :style="{ '--lumi-fill': `${progressPercent}%` }"
          aria-label="Posición de la canción"
          :aria-valuetext="`${clock(shownPosition)} de ${clock(duration)}`"
          @input="onSeekInput"
          @change="onSeekCommit"
        />
        <div class="mt-0.5 flex justify-between text-[11px] tabular-nums text-lumia-ink/55">
          <span>{{ clock(shownPosition) }}</span>
          <span>{{ duration ? clock(duration) : '--:--' }}</span>
        </div>
      </div>

      <!-- Transporte: aleatorio, anterior, reproducir/pausar, siguiente, repetir. -->
      <div class="flex items-center justify-center gap-2 px-3 pt-1">
        <button
          type="button"
          :class="[iconButton, state.shuffle ? activeToggle : '']"
          :disabled="!canControl || busy"
          :aria-pressed="state.shuffle ? 'true' : 'false'"
          :title="state.shuffle ? 'Aleatorio activado' : 'Aleatorio'"
          @click="music.send({ tool: 'music.shuffle', args: { state: state.shuffle ? 'off' : 'on' } })"
        >
          <IconArrowsShuffle class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
          <span class="sr-only">Modo aleatorio</span>
        </button>
        <button
          type="button"
          :class="iconButton"
          :disabled="!canControl || !track || busy"
          aria-label="Canción anterior"
          title="Anterior"
          @click="music.send({ tool: 'music.previous' })"
        >
          <IconPlayerSkipBackFilled class="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lumia-ink text-lumia-cream shadow-soft transition-transform duration-150 hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          :disabled="!canControl || !track || busy || !primary.tool"
          :aria-label="primary.label"
          :title="primary.label"
          @click="onPrimary"
        >
          <IconLoader2 v-if="state.status === 'loading' || busy" class="h-5 w-5 animate-spin" stroke-width="2" aria-hidden="true" />
          <IconPlayerPauseFilled v-else-if="state.status === 'playing'" class="h-5 w-5" aria-hidden="true" />
          <IconPlayerPlayFilled v-else class="h-5 w-5 translate-x-[1px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          :class="iconButton"
          :disabled="!canControl || !canNext || busy"
          aria-label="Canción siguiente"
          title="Siguiente"
          @click="music.send({ tool: 'music.next' })"
        >
          <IconPlayerSkipForwardFilled class="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          :class="[iconButton, state.repeatMode !== 'off' ? activeToggle : '']"
          :disabled="!canControl || busy"
          :aria-label="repeatMeta.label"
          :title="repeatMeta.label"
          @click="music.send({ tool: 'music.repeat', args: { repeat: repeatMeta.next } })"
        >
          <IconRepeatOnce v-if="state.repeatMode === 'one'" class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
          <IconRepeat v-else class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
        </button>
      </div>

      <!-- Secundarios: detener y volumen. -->
      <div class="flex items-center gap-2 px-3.5 pb-3 pt-1.5">
        <button
          type="button"
          :class="iconButton"
          :disabled="!canControl || !isRunning || busy"
          aria-label="Detener la música"
          title="Detener"
          @click="music.send({ tool: 'music.stop' })"
        >
          <IconPlayerStopFilled class="h-4 w-4" aria-hidden="true" />
        </button>
        <label class="ml-auto flex items-center gap-2" :title="`Volumen ${shownVolume} %`">
          <component :is="volumeIcon" class="h-4 w-4 shrink-0 text-lumia-ink/60" stroke-width="1.75" aria-hidden="true" />
          <span class="sr-only">Volumen</span>
          <input
            type="range"
            class="lumi-range w-28"
            min="0"
            max="100"
            step="5"
            :value="shownVolume"
            :disabled="!canControl || busy"
            :style="{ '--lumi-fill': `${shownVolume}%` }"
            :aria-valuetext="`${shownVolume} %`"
            @input="onVolumeInput"
            @change="onVolumeCommit"
          />
          <span class="w-8 text-right text-[11px] tabular-nums text-lumia-ink/55" aria-hidden="true">{{ shownVolume }}%</span>
        </label>
      </div>

      <!-- Problemas reales del reproductor o de la última orden. -->
      <p
        v-if="problem"
        class="flex items-start gap-1.5 border-t border-status-danger/20 bg-status-danger-soft px-3.5 py-2 text-[12px] text-status-danger"
        role="alert"
      >
        <IconAlertTriangle class="mt-[1px] h-3.5 w-3.5 shrink-0" stroke-width="1.75" aria-hidden="true" />
        {{ problem }}
      </p>
      <p v-else-if="!canControl" class="border-t border-lumia-ink/[0.07] px-3.5 py-2 text-[11px] text-lumia-ink/55">
        Solo puedes ver la música: controlarla requiere el permiso «Música · Controlar».
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconBrandYoutube,
  IconChevronRight,
  IconLoader2,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerStopFilled,
  IconRepeat,
  IconRepeatOnce,
  IconVolume,
  IconVolume2,
  IconVolume3,
} from '@tabler/icons-vue'
import type { LumiMusicRepeatMode } from '#shared/schemas/lumi-music'

/**
 * Reproductor de la música de Lumi. Muestra el estado REAL del reproductor del servidor
 * (useLumiMusic) y envía sus órdenes a través del BFF: nada cambia en pantalla hasta que el servidor
 * lo confirma. No reproduce audio en el navegador: la música suena en el servidor.
 *  - completo: pestaña Música (portada destacada, transporte, modos, volumen).
 *  - compact: tarjeta del chat (canción, reproducir/pausar y «Abrir música»).
 */
defineProps<{ compact?: boolean }>()

const music = useLumiMusic()
const state = computed(() => music.state.value)
const track = computed(() => state.value?.current ?? null)
const duration = computed(() => state.value?.durationSeconds ?? track.value?.durationSeconds ?? 0)
const canControl = computed(() => music.canControl.value)
const busy = computed(() => music.pending.value !== null)
const isRunning = computed(() => ['loading', 'playing', 'paused'].includes(state.value?.status ?? ''))
const canSeek = computed(() => canControl.value && !busy.value && Boolean(duration.value) && ['playing', 'paused'].includes(state.value?.status ?? ''))
/** Siguiente: hay cola, o el servidor puede seguir (repetir la cola o reproducción automática). */
const canNext = computed(() => {
  const current = state.value
  if (!current?.current) return false
  return current.upcoming.length > 0 || current.repeatMode === 'all' || current.autoplay
})

const iconButton =
  'relative inline-flex h-9 w-9 items-center justify-center rounded-full text-lumia-ink/75 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent'
const activeToggle = 'bg-lumia-gold/20 text-lumia-ink ring-1 ring-inset ring-lumia-gold/45 hover:bg-lumia-gold/30'

const STATUS: Record<string, { label: string; class: string }> = {
  playing: { label: 'Sonando', class: 'bg-status-positive-soft text-status-positive' },
  loading: { label: 'Cargando', class: 'bg-lumia-beige/70 text-lumia-ink/75' },
  paused: { label: 'En pausa', class: 'bg-lumia-cream text-lumia-ink/70' },
  stopped: { label: 'Detenida', class: 'bg-lumia-cream text-lumia-ink/60' },
  idle: { label: 'Sin música', class: 'bg-lumia-cream text-lumia-ink/60' },
  error: { label: 'Error', class: 'bg-status-danger-soft text-status-danger' },
}
const statusMeta = computed(() => STATUS[state.value?.status ?? 'idle'] ?? STATUS.idle!)

const REPEAT: Record<LumiMusicRepeatMode, { label: string; next: LumiMusicRepeatMode }> = {
  off: { label: 'Repetir: desactivado', next: 'all' },
  all: { label: 'Repetir: toda la cola', next: 'one' },
  one: { label: 'Repetir: esta canción', next: 'off' },
}
const repeatMeta = computed(() => REPEAT[state.value?.repeatMode ?? 'off'])

const primary = computed(() => {
  const status = state.value?.status
  if (status === 'playing') return { label: 'Pausar', tool: 'music.pause' as const }
  if (status === 'paused') return { label: 'Reanudar', tool: 'music.resume' as const }
  if (status === 'loading') return { label: 'Cargando…', tool: null }
  return { label: 'Reproducir', tool: 'music.play' as const }
})

function onPrimary() {
  const tool = primary.value.tool
  if (tool) void music.send({ tool })
}

/* Posición: mientras se arrastra se muestra la del usuario; al soltar se envía. */
const dragPosition = ref<number | null>(null)
const shownPosition = computed(() => Math.floor(dragPosition.value ?? music.position.value))
const progressPercent = computed(() => (duration.value ? Math.min(100, (shownPosition.value / duration.value) * 100) : 0))

function onSeekInput(event: Event) {
  dragPosition.value = Number((event.target as HTMLInputElement).value)
}
async function onSeekCommit(event: Event) {
  const position = Math.round(Number((event.target as HTMLInputElement).value))
  await music.send({ tool: 'music.seek', args: { position } })
  dragPosition.value = null
}

/* Volumen: igual, se envía al soltar (no una orden por cada paso del deslizador). */
const dragVolume = ref<number | null>(null)
const shownVolume = computed(() => dragVolume.value ?? state.value?.volume ?? 0)
const volumeIcon = computed(() => (shownVolume.value === 0 ? IconVolume3 : shownVolume.value < 50 ? IconVolume2 : IconVolume))

function onVolumeInput(event: Event) {
  dragVolume.value = Number((event.target as HTMLInputElement).value)
}
async function onVolumeCommit(event: Event) {
  const level = Math.round(Number((event.target as HTMLInputElement).value))
  await music.send({ tool: 'music.volume', args: { level } })
  dragVolume.value = null
}

/** Error del reproductor (p. ej. sin salida de audio) o de la última orden. */
const problem = computed(() => music.notice.value ?? (state.value?.error ? `Último problema: ${state.value.error}.` : null))

function clock(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
</script>

<style scoped>
/* Indicador de audio: tres barras que suben y bajan mientras suena. */
.lumi-eq-bar {
  height: 40%;
  animation: lumi-eq 0.9s ease-in-out infinite;
}
.lumi-eq-bar:nth-child(2) {
  animation-delay: -0.3s;
}
.lumi-eq-bar:nth-child(3) {
  animation-delay: -0.6s;
}
@keyframes lumi-eq {
  0%,
  100% {
    height: 30%;
  }
  50% {
    height: 100%;
  }
}

/* Deslizadores con la marca de Lumia: pista tinta suave, parte recorrida dorada. */
.lumi-range {
  --lumi-fill: 0%;
  height: 1rem;
  cursor: pointer;
  appearance: none;
  background: transparent;
}
.lumi-range:disabled {
  cursor: default;
  opacity: 0.55;
}
.lumi-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(to right, #c9a24a var(--lumi-fill), rgb(43 43 43 / 0.12) var(--lumi-fill));
}
.lumi-range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: rgb(43 43 43 / 0.12);
}
.lumi-range::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: #c9a24a;
}
.lumi-range::-webkit-slider-thumb {
  appearance: none;
  margin-top: -4px;
  height: 12px;
  width: 12px;
  border-radius: 999px;
  background: #2b2b2b;
  box-shadow: 0 0 0 2px #fff;
  transition: transform 0.15s ease;
}
.lumi-range::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border: 0;
  border-radius: 999px;
  background: #2b2b2b;
  box-shadow: 0 0 0 2px #fff;
}
.lumi-range:not(:disabled):hover::-webkit-slider-thumb,
.lumi-range:focus-visible::-webkit-slider-thumb {
  transform: scale(1.2);
}
.lumi-range:focus-visible {
  outline: 2px solid rgb(201 162 74 / 0.7);
  outline-offset: 2px;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .lumi-eq-bar {
    animation: none;
    height: 70%;
  }
  .lumi-range::-webkit-slider-thumb {
    transition: none;
  }
}
</style>
