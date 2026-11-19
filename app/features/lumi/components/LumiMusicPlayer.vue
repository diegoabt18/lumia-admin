<template>
  <section
    class="lumi-player w-full overflow-hidden rounded-2xl border border-lumia-ink/10 bg-white shadow-soft"
    aria-label="Reproductor de música de Lumi"
  >
    <!-- Sin música disponible (apagada en el servidor o sin conexión con el asistente). -->
    <div v-if="music.available.value === false" class="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-lumia-ink/65">
      <IconMusic class="h-4 w-4 shrink-0 text-lumia-ink/45" stroke-width="1.75" aria-hidden="true" />
      El reproductor de música no está disponible ahora mismo.
    </div>

    <div v-else-if="!state" class="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-lumia-ink/65" role="status">
      <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent" aria-hidden="true" />
      Consultando el reproductor…
    </div>

    <template v-else>
      <!-- Pista: portada, estado, título, artista y álbum. -->
      <div class="flex gap-3 p-3">
        <div class="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-lumia-cream">
          <img
            v-if="track?.thumbnailUrl && !coverFailed"
            :key="track.thumbnailUrl"
            :src="track.thumbnailUrl"
            alt=""
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            class="h-full w-full scale-[1.34] object-cover"
            @error="coverFailed = true"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-lumia-ink/35">
            <IconMusic class="h-7 w-7" stroke-width="1.5" aria-hidden="true" />
          </div>
          <span
            v-if="state.status === 'playing'"
            class="lumi-eq absolute bottom-1.5 left-1.5 flex h-3.5 items-end gap-[2px] rounded-md bg-lumia-black/55 px-1 py-[3px]"
            aria-hidden="true"
          >
            <span v-for="bar in 3" :key="bar" class="lumi-eq-bar w-[3px] rounded-full bg-lumia-cream" />
          </span>
        </div>

        <div class="min-w-0 flex-1">
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
            <span v-else-if="track" class="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-lumia-ink/55">
              <IconBrandYoutube class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
              YouTube
            </span>
          </div>

          <template v-if="track">
            <p class="mt-1 line-clamp-2 text-[14px] font-medium leading-snug text-lumia-ink" :title="track.title">{{ track.title }}</p>
            <p v-if="track.artist" class="truncate text-[12px] text-lumia-ink/65">{{ track.artist }}</p>
            <p v-if="track.album" class="truncate text-[11px] text-lumia-ink/50">{{ track.album }}</p>
          </template>
          <p v-else class="mt-1 text-[13px] text-lumia-ink/65">No hay ninguna canción cargada.</p>
        </div>
      </div>

      <!-- Progreso: barra interactiva (salta a una posición) y tiempos. -->
      <div v-if="track" class="px-3">
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

      <!-- Controles. -->
      <div class="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 pt-1">
        <button
          type="button"
          :class="iconButton"
          :disabled="!canControl || !track || busy"
          aria-label="Canción anterior"
          title="Anterior"
          @click="music.send({ tool: 'music.previous' })"
        >
          <IconPlayerSkipBackFilled class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-lumia-ink text-lumia-cream shadow-soft transition-transform duration-150 hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          :disabled="!canControl || !track || busy"
          :aria-label="primary.label"
          :title="primary.label"
          @click="onPrimary"
        >
          <IconLoader2 v-if="state.status === 'loading' || music.pending.value" class="h-[18px] w-[18px] animate-spin" stroke-width="2" aria-hidden="true" />
          <IconPlayerPauseFilled v-else-if="state.status === 'playing'" class="h-[18px] w-[18px]" aria-hidden="true" />
          <IconPlayerPlayFilled v-else class="h-[18px] w-[18px] translate-x-[1px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          :class="iconButton"
          :disabled="!canControl || !state.upcoming.length || busy"
          aria-label="Canción siguiente"
          title="Siguiente"
          @click="music.send({ tool: 'music.next' })"
        >
          <IconPlayerSkipForwardFilled class="h-4 w-4" aria-hidden="true" />
        </button>
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

        <div class="ml-auto flex items-center gap-1.5">
          <label class="flex items-center gap-1.5" :title="`Volumen ${shownVolume} %`">
            <component :is="volumeIcon" class="h-4 w-4 shrink-0 text-lumia-ink/60" stroke-width="1.75" aria-hidden="true" />
            <span class="sr-only">Volumen</span>
            <input
              type="range"
              class="lumi-range w-[4.5rem] sm:w-20"
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
          </label>
          <button
            type="button"
            :class="[iconButton, queueOpen ? 'bg-lumia-cream text-lumia-ink' : '']"
            :aria-expanded="queueOpen ? 'true' : 'false'"
            :aria-controls="queueId"
            :title="`Cola (${state.upcoming.length})`"
            @click="queueOpen = !queueOpen"
          >
            <IconPlaylist class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
            <span class="sr-only">Cola de reproducción</span>
            <span
              v-if="state.upcoming.length"
              class="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-lumia-gold px-1 text-center text-[9px] font-semibold leading-4 text-lumia-black"
              aria-hidden="true"
            >{{ state.upcoming.length }}</span>
          </button>
        </div>
      </div>

      <!-- Cola de reproducción. -->
      <div v-if="queueOpen" :id="queueId" class="border-t border-lumia-ink/[0.07] bg-lumia-canvas px-3 py-2.5">
        <p class="lumia-eyebrow mb-1.5 text-[10px]">A continuación</p>
        <p v-if="!state.upcoming.length" class="text-[12px] text-lumia-ink/60">
          La cola está vacía. Pide a Lumi «añade … a la cola».
        </p>
        <ol v-else class="max-h-48 space-y-0.5 overflow-y-auto">
          <li v-for="(item, index) in state.upcoming" :key="`${item.videoId}-${index}`">
            <button
              type="button"
              class="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canControl || busy"
              :aria-label="`Reproducir ${item.title}`"
              @click="music.send({ tool: 'music.jump', args: { position: index + 1 } })"
            >
              <span class="w-4 shrink-0 text-center text-[11px] tabular-nums text-lumia-ink/45 group-hover:hidden">{{ index + 1 }}</span>
              <IconPlayerPlayFilled class="hidden h-4 w-4 shrink-0 text-lumia-ink group-hover:block" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[12.5px] text-lumia-ink">{{ item.title }}</span>
                <span v-if="item.artist" class="block truncate text-[11px] text-lumia-ink/55">{{ item.artist }}</span>
              </span>
              <span v-if="item.durationSeconds" class="shrink-0 text-[11px] tabular-nums text-lumia-ink/45">{{ clock(item.durationSeconds) }}</span>
            </button>
          </li>
        </ol>
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
  IconBrandYoutube,
  IconLoader2,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerStopFilled,
  IconPlaylist,
  IconVolume,
  IconVolume2,
  IconVolume3,
} from '@tabler/icons-vue'

/**
 * Reproductor de la música de Lumi dentro del chat. Muestra el estado REAL del reproductor del
 * servidor (useLumiMusic) y envía sus órdenes a través del BFF. No reproduce audio en el navegador:
 * la música suena en el servidor, aunque se cierre el chat.
 */
const music = useLumiMusic()
const state = computed(() => music.state.value)
const track = computed(() => state.value?.current ?? null)
const duration = computed(() => state.value?.durationSeconds ?? track.value?.durationSeconds ?? 0)
const canControl = computed(() => music.canControl.value)
const busy = computed(() => music.pending.value !== null)
const isRunning = computed(() => ['loading', 'playing', 'paused'].includes(state.value?.status ?? ''))
const canSeek = computed(() => canControl.value && !busy.value && Boolean(duration.value) && ['playing', 'paused'].includes(state.value?.status ?? ''))
const queueOpen = ref(false)
const queueId = useId()
const coverFailed = ref(false)
watch(() => track.value?.thumbnailUrl, () => (coverFailed.value = false))

const iconButton =
  'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-lumia-ink/75 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent'

const STATUS: Record<string, { label: string; class: string }> = {
  playing: { label: 'Sonando', class: 'bg-status-positive-soft text-status-positive' },
  loading: { label: 'Cargando', class: 'bg-lumia-beige/70 text-lumia-ink/75' },
  paused: { label: 'En pausa', class: 'bg-lumia-cream text-lumia-ink/70' },
  stopped: { label: 'Detenida', class: 'bg-lumia-cream text-lumia-ink/60' },
  idle: { label: 'Sin música', class: 'bg-lumia-cream text-lumia-ink/60' },
  error: { label: 'Error', class: 'bg-status-danger-soft text-status-danger' },
}
const statusMeta = computed(() => STATUS[state.value?.status ?? 'idle'] ?? STATUS.idle!)

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

onMounted(music.attach)
onBeforeUnmount(music.detach)
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
