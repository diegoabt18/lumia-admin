import type { LumiMusicDiscovery, LumiMusicTrack, LumiMusicTracksResponse } from '#shared/schemas/lumi-music'

/**
 * Descubrir, buscar e historial del centro de música. Datos reales del asistente (YouTube) a través
 * del BFF; nada se inventa. Se piden solo cuando el usuario abre cada sección:
 *  - Recomendaciones: una vez por canción (se guardan por videoId mientras dure la sesión).
 *  - Historial: al abrir la sección y tras cada cambio de canción mientras está abierta.
 *  - Búsqueda: al enviar el formulario.
 */

type Load = 'idle' | 'loading' | 'ready' | 'error'

export function useLumiMusicLibrary() {
  const { request } = useAdminApi()

  const discovery = useState<LumiMusicDiscovery | null>('lumi-music-discovery', () => null)
  const discoveryFor = useState<string | null>('lumi-music-discovery-for', () => null)
  const discoveryLoad = useState<Load>('lumi-music-discovery-load', () => 'idle')

  const results = useState<LumiMusicTrack[]>('lumi-music-search-results', () => [])
  const searched = useState<string>('lumi-music-searched', () => '')
  const searchLoad = useState<Load>('lumi-music-search-load', () => 'idle')

  const history = useState<LumiMusicTrack[]>('lumi-music-history', () => [])
  const historyLoad = useState<Load>('lumi-music-history-load', () => 'idle')

  /** Recomendaciones para una canción; no repite la consulta si ya las tiene. */
  async function loadDiscovery(videoId: string, force = false): Promise<void> {
    if (!force && discoveryFor.value === videoId && discoveryLoad.value !== 'error') return
    discoveryFor.value = videoId
    discoveryLoad.value = 'loading'
    try {
      const response = await request<LumiMusicDiscovery & { available: boolean }>('/api/admin/lumi/music/recommendations', {
        query: { videoId },
      })
      if (discoveryFor.value !== videoId) return // llegó tarde: ya se pidió otra canción
      discovery.value = response
      discoveryLoad.value = response.available ? 'ready' : 'error'
    } catch {
      if (discoveryFor.value === videoId) discoveryLoad.value = 'error'
    }
  }

  async function search(query: string): Promise<void> {
    const q = query.trim()
    if (!q) return
    searched.value = q
    searchLoad.value = 'loading'
    try {
      const response = await request<LumiMusicTracksResponse>('/api/admin/lumi/music/search', { query: { q } })
      if (searched.value !== q) return
      results.value = response.tracks
      searchLoad.value = response.available ? 'ready' : 'error'
    } catch {
      if (searched.value === q) searchLoad.value = 'error'
    }
  }

  function clearSearch() {
    searched.value = ''
    results.value = []
    searchLoad.value = 'idle'
  }

  async function loadHistory(): Promise<void> {
    historyLoad.value = history.value.length ? historyLoad.value : 'loading'
    try {
      const response = await request<LumiMusicTracksResponse>('/api/admin/lumi/music/history')
      history.value = response.tracks
      historyLoad.value = response.available ? 'ready' : 'error'
    } catch {
      historyLoad.value = 'error'
    }
  }

  return {
    discovery,
    discoveryFor,
    discoveryLoad,
    loadDiscovery,
    results,
    searched,
    searchLoad,
    search,
    clearSearch,
    history,
    historyLoad,
    loadHistory,
  }
}
