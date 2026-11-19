<template>
  <template v-if="canControl">
    <button type="button" :class="button" :disabled="busy" :aria-label="`Reproducir ${track.title}`" title="Reproducir ahora" @click="music.send({ tool: 'music.play', args: { video_id: track.videoId } })">
      <IconPlayerPlayFilled class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <button type="button" :class="button" :disabled="busy || queued" :aria-label="`Reproducir ${track.title} a continuación`" title="Reproducir a continuación" @click="music.send({ tool: 'music.play_next', args: { video_id: track.videoId } })">
      <IconCornerDownRight class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
    </button>
    <button type="button" :class="button" :disabled="busy || queued" :aria-label="queued ? `${track.title} ya está en la cola` : `Añadir ${track.title} a la cola`" :title="queued ? 'Ya está en la cola' : 'Añadir a la cola'" @click="music.send({ tool: 'music.enqueue', args: { video_id: track.videoId } })">
      <IconCheck v-if="queued" class="h-4 w-4 text-status-positive" stroke-width="2" aria-hidden="true" />
      <IconPlaylistAdd v-else class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
    </button>
  </template>
</template>

<script setup lang="ts">
import { IconCheck, IconCornerDownRight, IconPlayerPlayFilled, IconPlaylistAdd } from '@tabler/icons-vue'
import type { LumiMusicTrack } from '#shared/schemas/lumi-music'

/** Acciones de una canción encontrada: reproducir, a continuación o a la cola (sin duplicados). */
const props = defineProps<{ track: LumiMusicTrack }>()
const music = useLumiMusic()
const canControl = computed(() => music.canControl.value)
const busy = computed(() => music.pending.value !== null)
const queued = computed(() => (music.state.value?.upcoming ?? []).some((t) => t.videoId === props.track.videoId))

const button =
  'inline-flex h-7 w-7 items-center justify-center rounded-full text-lumia-ink/60 transition-colors hover:bg-white hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent'
</script>
