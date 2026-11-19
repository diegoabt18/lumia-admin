<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-lumia-canvas/50">
    <div class="space-y-3 p-3 sm:p-4">
      <LumiMusicPlayer />

      <!-- Secciones del centro de música. -->
      <div class="flex gap-1 rounded-xl bg-lumia-cream/70 p-1" role="tablist" aria-label="Secciones de música">
        <button
          v-for="item in SECTIONS"
          :id="`lumi-music-tab-${item.key}`"
          :key="item.key"
          type="button"
          role="tab"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
          :class="section === item.key ? 'bg-white text-lumia-ink shadow-soft' : 'text-lumia-ink/60 hover:text-lumia-ink'"
          :aria-selected="section === item.key ? 'true' : 'false'"
          :aria-controls="`lumi-music-panel-${item.key}`"
          :tabindex="section === item.key ? 0 : -1"
          @click="section = item.key"
          @keydown.right.prevent="moveSection(1)"
          @keydown.left.prevent="moveSection(-1)"
        >
          <component :is="item.icon" class="h-3.5 w-3.5" stroke-width="1.9" aria-hidden="true" />
          {{ item.label }}
          <span v-if="item.key === 'queue' && upcoming.length" class="rounded-full bg-lumia-gold/25 px-1.5 text-[10px] tabular-nums text-lumia-ink">
            {{ upcoming.length }}
          </span>
        </button>
      </div>

      <!-- Cola -->
      <section v-if="section === 'queue'" id="lumi-music-panel-queue" role="tabpanel" aria-labelledby="lumi-music-tab-queue" class="space-y-2">
        <div class="flex items-center gap-2 rounded-xl border border-lumia-ink/10 bg-white px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="text-[12.5px] font-medium text-lumia-ink">Reproducción automática</p>
            <p class="text-[11px] leading-snug text-lumia-ink/55">Al acabar la cola, sigue con canciones relacionadas.</p>
          </div>
          <button
            type="button"
            role="switch"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold disabled:cursor-not-allowed disabled:opacity-40"
            :class="autoplay ? 'bg-lumia-ink' : 'bg-lumia-ink/20'"
            :aria-checked="autoplay ? 'true' : 'false'"
            aria-label="Reproducción automática"
            :disabled="!canControl || busy || !state"
            @click="music.send({ tool: 'music.autoplay', args: { state: autoplay ? 'off' : 'on' } })"
          >
            <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform" :class="autoplay ? 'translate-x-[22px]' : 'translate-x-0.5'" />
          </button>
        </div>

        <div class="rounded-xl border border-lumia-ink/10 bg-white p-1.5">
          <div class="flex items-center justify-between px-2 pb-1 pt-1">
            <p class="lumia-eyebrow text-[10px]">A continuación</p>
            <button
              v-if="upcoming.length"
              type="button"
              class="rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-lumia-ink/60 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/70 disabled:opacity-40"
              :disabled="!canControl || busy"
              @click="music.send({ tool: 'music.clear_queue' })"
            >
              Vaciar cola
            </button>
          </div>
          <p v-if="!upcoming.length" class="px-2 pb-2 text-[12px] leading-relaxed text-lumia-ink/60">
            La cola está vacía. Añade canciones desde «Descubrir» o pídeselo a Lumi: «añade … a la cola».
          </p>
          <ol v-else class="space-y-0.5">
            <LumiMusicTrackRow v-for="(item, index) in upcoming" :key="`${item.videoId}-${index}`" :track="item" :index="index + 1">
              <button type="button" :class="rowButton" :disabled="!canControl || busy" :aria-label="`Reproducir ${item.title}`" title="Reproducir ahora" @click="music.send({ tool: 'music.jump', args: { position: index + 1 } })">
                <IconPlayerPlayFilled class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button type="button" :class="rowButton" :disabled="!canControl || busy || index === 0" :aria-label="`Subir ${item.title}`" title="Subir" @click="move(index, -1)">
                <IconChevronUp class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
              </button>
              <button type="button" :class="rowButton" :disabled="!canControl || busy || index === upcoming.length - 1" :aria-label="`Bajar ${item.title}`" title="Bajar" @click="move(index, 1)">
                <IconChevronDown class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
              </button>
              <button type="button" :class="rowButton" :disabled="!canControl || busy" :aria-label="`Quitar ${item.title} de la cola`" title="Quitar" @click="music.send({ tool: 'music.remove', args: { position: index + 1 } })">
                <IconX class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
              </button>
            </LumiMusicTrackRow>
          </ol>
        </div>
      </section>

      <!-- Descubrir -->
      <section v-else-if="section === 'discover'" id="lumi-music-panel-discover" role="tabpanel" aria-labelledby="lumi-music-tab-discover" class="space-y-3">
        <form class="flex gap-1.5" role="search" @submit.prevent="library.search(query)">
          <label class="relative flex-1">
            <span class="sr-only">Buscar canciones</span>
            <IconSearch class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lumia-ink/45" stroke-width="1.75" aria-hidden="true" />
            <input
              v-model="query"
              type="search"
              maxlength="200"
              placeholder="Busca una canción o un artista"
              class="h-9 w-full rounded-xl border border-lumia-ink/15 bg-white pl-8 pr-2.5 text-[13px] text-lumia-ink placeholder:text-lumia-ink/40 focus:border-lumia-gold focus:outline-none focus:ring-2 focus:ring-lumia-gold/30"
            />
          </label>
          <button
            type="submit"
            class="h-9 shrink-0 rounded-xl bg-lumia-ink px-3 text-[12.5px] font-medium text-lumia-cream transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold disabled:opacity-40"
            :disabled="!query.trim() || library.searchLoad.value === 'loading'"
          >
            Buscar
          </button>
        </form>

        <!-- Resultados de búsqueda -->
        <div v-if="library.searched.value" class="rounded-xl border border-lumia-ink/10 bg-white p-1.5">
          <div class="flex items-center justify-between px-2 pb-1 pt-1">
            <p class="lumia-eyebrow text-[10px]">Resultados para «{{ library.searched.value }}»</p>
            <button type="button" class="rounded-md px-1.5 py-0.5 text-[11.5px] text-lumia-ink/55 hover:bg-lumia-cream hover:text-lumia-ink" @click="clearSearch">Cerrar</button>
          </div>
          <LumiMusicListState :load="library.searchLoad.value" :empty="!library.results.value.length" empty-text="No encontré canciones con esa búsqueda." @retry="library.search(library.searched.value)" />
          <ul v-if="library.searchLoad.value === 'ready'" class="space-y-0.5">
            <LumiMusicTrackRow v-for="item in library.results.value" :key="item.videoId" :track="item">
              <LumiMusicTrackActions :track="item" />
            </LumiMusicTrackRow>
          </ul>
        </div>

        <template v-if="seed">
          <!-- Parecidas a la que suena (Mix real de YouTube) -->
          <div class="rounded-xl border border-lumia-ink/10 bg-white p-1.5">
            <p class="lumia-eyebrow truncate px-2 pb-1 pt-1 text-[10px]">Parecidas a «{{ seed.title }}»</p>
            <LumiMusicListState :load="library.discoveryLoad.value" :empty="!related.length" empty-text="No encontré canciones parecidas." @retry="loadDiscovery(true)" />
            <ul v-if="library.discoveryLoad.value === 'ready'" class="space-y-0.5">
              <LumiMusicTrackRow v-for="item in related" :key="item.videoId" :track="item">
                <LumiMusicTrackActions :track="item" />
                <button type="button" :class="rowButton" :aria-label="`Descartar ${item.title}`" title="Descartar" @click="dismiss(item.videoId)">
                  <IconX class="h-4 w-4" stroke-width="1.9" aria-hidden="true" />
                </button>
              </LumiMusicTrackRow>
            </ul>
          </div>

          <!-- Artistas relacionados: abren su búsqueda -->
          <div v-if="library.discoveryLoad.value === 'ready' && artists.length" class="space-y-1.5">
            <p class="lumia-eyebrow px-1 text-[10px]">Artistas relacionados</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="artist in artists"
                :key="artist.name"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-lumia-ink/10 bg-white px-2.5 py-1 text-[12px] text-lumia-ink/80 transition-colors hover:border-lumia-gold/50 hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/70"
                @click="searchArtist(artist.name)"
              >
                <IconUser class="h-3.5 w-3.5 text-lumia-ink/45" stroke-width="1.75" aria-hidden="true" />
                {{ artist.name }}
              </button>
            </div>
          </div>

          <!-- Más del mismo artista -->
          <div v-if="library.discoveryLoad.value === 'ready' && artistTracks.length" class="rounded-xl border border-lumia-ink/10 bg-white p-1.5">
            <p class="lumia-eyebrow truncate px-2 pb-1 pt-1 text-[10px]">Más de {{ seed.artist }}</p>
            <ul class="space-y-0.5">
              <LumiMusicTrackRow v-for="item in artistTracks" :key="item.videoId" :track="item">
                <LumiMusicTrackActions :track="item" />
              </LumiMusicTrackRow>
            </ul>
          </div>
        </template>
        <p v-else-if="!library.searched.value" class="rounded-xl border border-dashed border-lumia-ink/15 px-3 py-4 text-center text-[12px] leading-relaxed text-lumia-ink/55">
          Pon una canción y aquí verás canciones parecidas y artistas relacionados. También puedes buscar arriba.
        </p>
      </section>

      <!-- Historial -->
      <section v-else id="lumi-music-panel-history" role="tabpanel" aria-labelledby="lumi-music-tab-history" class="rounded-xl border border-lumia-ink/10 bg-white p-1.5">
        <p class="lumia-eyebrow px-2 pb-1 pt-1 text-[10px]">Sonaron hace poco</p>
        <LumiMusicListState :load="library.historyLoad.value" :empty="!library.history.value.length" empty-text="Todavía no ha sonado ninguna canción." @retry="library.loadHistory()" />
        <ul v-if="library.historyLoad.value === 'ready'" class="space-y-0.5">
          <LumiMusicTrackRow v-for="(item, index) in library.history.value" :key="`${item.videoId}-${index}`" :track="item">
            <LumiMusicTrackActions :track="item" />
          </LumiMusicTrackRow>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IconChevronDown,
  IconChevronUp,
  IconClockHour4,
  IconCompass,
  IconPlayerPlayFilled,
  IconPlaylist,
  IconSearch,
  IconUser,
  IconX,
} from '@tabler/icons-vue'

/**
 * Centro de música de Lumi (pestaña Música del panel). Reproductor, cola, descubrir e historial.
 * Todo lo que muestra viene del servidor; las acciones se aplican cuando el servidor las confirma.
 */
type Section = 'queue' | 'discover' | 'history'
const SECTIONS = [
  { key: 'queue', label: 'Cola', icon: IconPlaylist },
  { key: 'discover', label: 'Descubrir', icon: IconCompass },
  { key: 'history', label: 'Historial', icon: IconClockHour4 },
] as const

const music = useLumiMusic()
const library = useLumiMusicLibrary()
const section = useState<Section>('lumi-music-section', () => 'queue')
const query = useState<string>('lumi-music-query', () => '')
const dismissed = useState<string[]>('lumi-music-dismissed', () => [])

const state = computed(() => music.state.value)
const upcoming = computed(() => state.value?.upcoming ?? [])
const autoplay = computed(() => Boolean(state.value?.autoplay))
const canControl = computed(() => music.canControl.value)
const busy = computed(() => music.pending.value !== null)
const seed = computed(() => state.value?.current ?? null)

const related = computed(() => (library.discovery.value?.tracks ?? []).filter((t) => !dismissed.value.includes(t.videoId)))
const artistTracks = computed(() => library.discovery.value?.artistTracks ?? [])
const artists = computed(() => library.discovery.value?.artists ?? [])

const rowButton =
  'inline-flex h-7 w-7 items-center justify-center rounded-full text-lumia-ink/60 transition-colors hover:bg-white hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumia-gold/70 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

function moveSection(step: number) {
  const index = SECTIONS.findIndex((s) => s.key === section.value)
  const next = SECTIONS[(index + step + SECTIONS.length) % SECTIONS.length]!
  section.value = next.key
  nextTick(() => document.getElementById(`lumi-music-tab-${next.key}`)?.focus())
}

function move(index: number, step: number) {
  void music.send({ tool: 'music.move', args: { position: index + 1, to: index + 1 + step } })
}

function dismiss(videoId: string) {
  dismissed.value = [...dismissed.value, videoId]
}

function loadDiscovery(force = false) {
  if (seed.value) void library.loadDiscovery(seed.value.videoId, force)
}

function searchArtist(name: string) {
  query.value = name
  void library.search(name)
}

function clearSearch() {
  query.value = ''
  library.clearSearch()
}

// Solo se consulta lo que se ve: recomendaciones al abrir «Descubrir» (una vez por canción) e
// historial al abrir «Historial» y cuando cambia la canción mientras está abierto.
watch(
  [section, () => seed.value?.videoId],
  ([current]) => {
    if (current === 'discover') loadDiscovery()
    if (current === 'history') void library.loadHistory()
  },
  { immediate: true },
)
</script>
