<template>
  <li class="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-lumia-cream/60 focus-within:bg-lumia-cream/60">
    <span v-if="index !== undefined" class="w-4 shrink-0 text-center text-[11px] tabular-nums text-lumia-ink/45">{{ index }}</span>
    <LumiMusicCover :src="track.thumbnailUrl" class="h-10 w-10" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-[13px] font-medium leading-tight text-lumia-ink" :title="track.title">{{ track.title }}</p>
      <p class="truncate text-[11.5px] text-lumia-ink/55">
        <span v-if="track.artist">{{ track.artist }}</span>
        <span v-if="track.artist && track.durationSeconds" aria-hidden="true"> · </span>
        <span v-if="track.durationSeconds" class="tabular-nums">{{ clock(track.durationSeconds) }}</span>
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <slot />
    </div>
  </li>
</template>

<script setup lang="ts">
import type { LumiMusicTrack } from '#shared/schemas/lumi-music'

/** Fila de canción (cola, descubrir, historial). Las acciones van en el slot. */
defineProps<{ track: LumiMusicTrack; index?: number }>()

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
</script>
