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
              v-else-if="candidates.status === 'playing' && candidate.id === candidates.selectedId"
              class="h-4 w-4 text-status-positive"
              stroke-width="2"
            />
          </span>
        </button>
      </li>
    </ul>

    <p v-if="statusLine" class="mt-2 text-[12px] leading-snug" :class="statusClass" role="status" aria-live="polite">
      {{ statusLine }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { IconBrandYoutube, IconCheck, IconPlayerPlayFilled } from '@tabler/icons-vue'
import type { LumiMusicCandidatesView } from '~/features/lumi/composables/useLumi'

/**
 * Vídeos de una búsqueda de música dudosa. La tarjeta solo envía la elección: el Server la valida,
 * la ejecuta en el equipo y la respuesta trae el resultado que comprobó el agente.
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

const heading = computed(() => {
  const count = props.candidates.candidates.length
  return count === 1
    ? `Encontré un vídeo para «${props.candidates.query}». ¿Lo pongo?`
    : `Encontré ${count} vídeos para «${props.candidates.query}». Elige cuál poner:`
})

const statusLine = computed(() => {
  if (pending.value) return 'Poniendo el vídeo en tu equipo…'
  return props.candidates.statusMessage
})

const statusClass = computed(() => {
  switch (props.candidates.status) {
    case 'playing':
      return 'text-status-positive'
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
