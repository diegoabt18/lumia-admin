<template>
  <div class="w-full max-w-[85%] space-y-3">
    <p class="text-[13px] text-lumia-ink/70">Encontré varios vídeos. Selecciona uno:</p>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <button
        v-for="(candidate, index) in candidates.candidates"
        :key="candidate.id"
        type="button"
        :aria-label="`${candidate.title} por ${candidate.artist}`"
        :class="[
          'group relative overflow-hidden rounded-xl border-2 transition-all duration-200',
          selectedIndex === index
            ? 'border-lumia-gold bg-lumia-cream/40 ring-2 ring-lumia-gold/30'
            : 'border-lumia-ink/10 bg-white hover:border-lumia-gold/50 hover:bg-lumia-cream/20',
          pendingSelection && selectedIndex === index ? 'opacity-50' : '',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ]"
        :disabled="disabled || (pendingSelection && selectedIndex !== index)"
        @click="selectCandidate(index, candidate.id)"
        @keydown.arrow-up.prevent="focusCandidate((index - 1 + candidates.candidates.length) % candidates.candidates.length)"
        @keydown.arrow-down.prevent="focusCandidate((index + 1) % candidates.candidates.length)"
        @keydown.arrow-left.prevent="focusCandidate((index - 1 + candidates.candidates.length) % candidates.candidates.length)"
        @keydown.arrow-right.prevent="focusCandidate((index + 1) % candidates.candidates.length)"
        @keydown.enter.prevent="selectCandidate(index, candidate.id)"
      >
        <!-- Thumbnail -->
        <div class="relative h-32 w-full overflow-hidden bg-lumia-ink/5">
          <img
            v-if="candidate.thumbnailUrl"
            :src="candidate.thumbnailUrl"
            alt=""
            class="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-lumia-beige to-lumia-cream">
            <IconMusicOff class="h-8 w-8 text-lumia-ink/30" stroke-width="1.5" />
          </div>

          <!-- State Badge -->
          <div class="absolute right-1.5 top-1.5">
            <span
              v-if="pendingSelection && selectedIndex === index"
              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lumia-gold/80 text-white"
            >
              <span class="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
            </span>
            <span v-else-if="selectedIndex === index" class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lumia-gold text-white">
              <IconCheck class="h-4 w-4" stroke-width="2" />
            </span>
          </div>

          <!-- Type Badge -->
          <div v-if="candidate.type !== 'unknown'" class="absolute left-1.5 bottom-1.5">
            <span class="inline-flex gap-1 rounded-full bg-lumia-ink/80 px-2 py-1 text-[10px] font-medium uppercase text-white">
              {{ typeBadge(candidate.type) }}
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="flex flex-col gap-1 p-2">
          <p class="line-clamp-2 text-left text-[12px] font-medium text-lumia-ink">{{ candidate.title }}</p>
          <p class="line-clamp-1 text-left text-[11px] text-lumia-ink/65">{{ candidate.artist || 'Unknown' }}</p>
          <p class="text-left text-[10px] text-lumia-ink/50">{{ formatDuration(candidate.duration) }}</p>
        </div>
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="selectionError" class="rounded-lg bg-red-50/60 px-3 py-2 text-[12px] text-red-700">
      {{ selectionError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCheck, IconMusicOff } from '@tabler/icons-vue'
import type { LumiMusicCandidatesView } from '~/features/lumi/composables/useLumi'

interface Props {
  candidates: LumiMusicCandidatesView
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  select: [index: number, candidateId: string]
}>()

const selectedIndex = ref(props.candidates.selectedIndex)
const pendingSelection = ref(props.candidates.pendingSelection)
const selectionError = ref(props.candidates.selectionError)

const selectedCandidate = ref<number | null>(null)

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function typeBadge(type: string): string {
  const badges: Record<string, string> = {
    song: '♪ Song',
    live: '🔴 Live',
    cover: '🎭 Cover',
    remix: '🔄 Remix',
    official: '✓ Official',
  }
  return badges[type] || ''
}

function selectCandidate(index: number, candidateId: string) {
  if (props.disabled || pendingSelection.value) return

  selectedIndex.value = index
  pendingSelection.value = true
  emit('select', index, candidateId)
}

function focusCandidate(index: number) {
  selectedCandidate.value = index
}

watch(
  () => props.candidates.selectedIndex,
  (newIndex) => {
    selectedIndex.value = newIndex
  },
)

watch(
  () => props.candidates.pendingSelection,
  (newPending) => {
    pendingSelection.value = newPending
  },
)

watch(
  () => props.candidates.selectionError,
  (newError) => {
    selectionError.value = newError
  },
)
</script>
