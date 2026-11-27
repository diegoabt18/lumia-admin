<template>
  <div class="w-full max-w-[26rem] rounded-2xl rounded-bl-md border border-lumia-gold/40 bg-white px-3.5 py-3 text-[14px] leading-relaxed text-lumia-ink">
    <p class="mb-1.5 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70">
      <IconBrandYoutube class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
      YouTube
    </p>
    <p :id="headingId" class="break-words">
      <span class="sr-only">Lumi: </span>{{ heading }}
    </p>

    <ul ref="list" class="mt-2.5 space-y-1.5" :aria-labelledby="headingId" @keydown="onKeydown">
      <li v-for="candidate in candidates.candidates" :key="candidate.id">
        <button
          type="button"
          class="group flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed"
          :class="
            candidate.id === candidates.selectedId
              ? 'border-lumia-gold bg-lumia-cream/60'
              : 'border-lumia-ink/10 hover:border-lumia-gold/50 hover:bg-lumia-cream/40 disabled:hover:border-lumia-ink/10 disabled:hover:bg-transparent'
          "
          :disabled="locked"
          :aria-pressed="candidate.id === candidates.selectedId"
          :aria-busy="pending && candidate.id === candidates.selectedId"
          @click="emit('select', candidate.id)"
        >
          <span class="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lumia-beige/50">
            <img v-if="candidate.thumbnailUrl" :src="candidate.thumbnailUrl" alt="" class="h-full w-full object-cover" loading="lazy" />
            <IconPlayerPlayFilled v-else class="h-4 w-4 text-lumia-ink/45" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="line-clamp-2 text-[13px] font-medium leading-snug text-lumia-ink">{{ candidate.title }}</span>
            <span class="mt-0.5 block truncate text-[11px] text-lumia-ink/60">{{ meta(candidate) }}</span>
          </span>
          <span class="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
            <span
              v-if="pending && candidate.id === candidates.selectedId"
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lumia-gold border-t-transparent"
            />
            <IconCheck
              v-else-if="sounding && candidate.id === candidates.selectedId"
              class="h-4 w-4"
              :class="candidates.status === 'partial' ? 'text-status-warning' : 'text-status-positive'"
              stroke-width="2"
            />
          </span>
        </button>
      </li>
    </ul>

    <ol
      v-if="steps"
      class="mt-3 space-y-1 border-t border-lumia-ink/10 pt-2.5"
      aria-label="Progreso de la reproducción en el equipo"
    >
      <li v-for="step in steps" :key="step.key" class="flex items-start gap-2 text-[12px] leading-snug">
        <span class="mt-px flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
          <IconCheck v-if="step.status === 'done'" class="h-3.5 w-3.5 text-status-positive" stroke-width="2.25" />
          <span
            v-else-if="step.status === 'current'"
            class="h-3 w-3 animate-spin rounded-full border-[1.5px] border-lumia-gold border-t-transparent"
          />
          <IconX v-else-if="step.status === 'failed'" class="h-3.5 w-3.5 text-status-danger" stroke-width="2.25" />
          <IconAlertTriangle
            v-else-if="step.status === 'warning'"
            class="h-3.5 w-3.5 text-status-warning"
            stroke-width="2"
          />
          <span v-else class="h-1.5 w-1.5 rounded-full bg-lumia-ink/20" />
        </span>
        <span class="min-w-0">
          <span :class="step.status === 'todo' ? 'text-lumia-ink/45' : 'text-lumia-ink/80'">{{ step.label }}</span>
          <span v-if="step.detail" class="text-lumia-ink/50"> · {{ step.detail }}</span>
          <span class="sr-only">: {{ STEP_STATUS_TEXT[step.status] }}</span>
        </span>
      </li>
    </ol>

    <p v-if="statusLine" class="mt-2 text-[12px] leading-snug" :class="statusClass" role="status" aria-live="polite">
      {{ statusLine }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconBrandYoutube, IconCheck, IconPlayerPlayFilled, IconX } from '@tabler/icons-vue'
import type { LumiMusicPlaybackState } from '#shared/schemas/lumi'
import type { LumiMusicCandidatesView } from '~/features/lumi/composables/useLumi'

/**
 * Vídeos de una búsqueda de música dudosa. La tarjeta solo envía la elección: el Server la valida,
 * la ejecuta en el equipo y va informando los estados que comprobó el agente hasta el resultado.
 */
const props = defineProps<{ candidates: LumiMusicCandidatesView }>()
const emit = defineEmits<{ select: [candidateId: string] }>()

const headingId = useId()
const list = ref<HTMLUListElement | null>(null)

const TYPE_LABEL: Record<LumiMusicCandidatesView['candidates'][number]['type'], string | null> = {
  official: 'Oficial',
  live: 'En vivo',
  cover: 'Cover',
  remix: 'Remix',
  song: null,
  unknown: null,
}

const pending = computed(() => props.candidates.status === 'pending')
const locked = computed(() => pending.value || props.candidates.status === 'expired')
const sounding = computed(() => props.candidates.status === 'playing' || props.candidates.status === 'partial')

/** Orden de los estados de éxito del Server: un paso está hecho si se alcanzó su estado. */
const SUCCESS_ORDER: readonly LumiMusicPlaybackState[] = [
  'RECEIVED',
  'VALIDATED',
  'BROWSER_READY',
  'TAB_READY',
  'NAVIGATING',
  'NAVIGATION_COMPLETED',
  'PLAYING',
  'MINIMIZING',
  'COMPLETED',
]

type StepStatus = 'done' | 'current' | 'failed' | 'warning' | 'todo'

const STEP_STATUS_TEXT: Record<StepStatus, string> = {
  done: 'hecho',
  current: 'en curso',
  failed: 'falló',
  warning: 'no se pudo',
  todo: 'pendiente',
}

const STEPS: ReadonlyArray<{ key: string; label: string; at: LumiMusicPlaybackState; working: string }> = [
  { key: 'received', label: 'Solicitud recibida', at: 'RECEIVED', working: 'Enviando la orden a tu equipo…' },
  { key: 'navigating', label: 'Navegación iniciada', at: 'NAVIGATING', working: 'Preparando el navegador de Lumia…' },
  { key: 'loaded', label: 'Vídeo cargado', at: 'NAVIGATION_COMPLETED', working: 'Abriendo el vídeo…' },
  { key: 'playing', label: 'Reproducción confirmada', at: 'PLAYING', working: 'Comprobando que el vídeo suena…' },
  { key: 'minimized', label: 'Ventana minimizada', at: 'COMPLETED', working: 'Minimizando el navegador…' },
]

const rank = (state: LumiMusicPlaybackState | null) => (state ? SUCCESS_ORDER.indexOf(state) : -1)

/**
 * Pasos de la reproducción. Solo con un equipo que informa estados (agente reciente): con uno
 * anterior la tarjeta muestra únicamente el resultado.
 */
const steps = computed(() => {
  const playback = props.candidates.playback
  if (!playback || (!pending.value && !playback.reached)) return null
  const reached = rank(playback.reached)
  const failedState = playback.state && rank(playback.state) === -1 ? playback.state : null
  let open = true
  return STEPS.map((step) => {
    let status: StepStatus = 'todo'
    if (reached >= rank(step.at)) status = 'done'
    else if (open) {
      open = false
      if (failedState === 'MINIMIZE_FAILED') status = 'warning'
      else if (failedState) status = 'failed'
      else if (pending.value) status = 'current'
    }
    const detail =
      step.key === 'navigating' && playback.tab
        ? playback.tab === 'reused'
          ? 'pestaña de Lumia reutilizada'
          : 'pestaña nueva'
        : null
    return { ...step, status, detail }
  })
})

const heading = computed(() => {
  const count = props.candidates.candidates.length
  return count === 1
    ? `Encontré un vídeo para «${props.candidates.query}». ¿Lo pongo?`
    : `Encontré ${count} vídeos para «${props.candidates.query}». Elige cuál poner:`
})

const statusLine = computed(() => {
  if (pending.value) return steps.value?.find((s) => s.status === 'current')?.working ?? 'Poniendo el vídeo en tu equipo…'
  return props.candidates.statusMessage
})

const statusClass = computed(() => {
  switch (props.candidates.status) {
    case 'playing':
      return 'text-status-positive'
    case 'partial':
    case 'unverified':
    case 'busy':
      return 'text-status-warning'
    case 'failed':
    case 'offline':
    case 'expired':
      return 'text-status-danger'
    default:
      return 'text-lumia-ink/60'
  }
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function meta(candidate: LumiMusicCandidatesView['candidates'][number]): string {
  return [candidate.artist, candidate.duration > 0 ? formatDuration(candidate.duration) : null, TYPE_LABEL[candidate.type]]
    .filter(Boolean)
    .join(' · ')
}

/** Flechas arriba/abajo mueven el foco dentro de la lista; Intro y Espacio los maneja el botón. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const buttons = Array.from(list.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (index === -1 || buttons.length === 0) return
  event.preventDefault()
  const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length
  buttons[next]?.focus()
}
</script>
