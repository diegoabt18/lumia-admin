import { PERMISSIONS } from '#shared/auth/permissions'
import type {
  LumiMusicCommand,
  LumiMusicCommandResponse,
  LumiMusicState,
  LumiMusicStateResponse,
} from '#shared/schemas/lumi-music'

/**
 * Estado del reproductor de música de Lumi en el navegador.
 *
 * La música suena en el servidor (nunca en el navegador). Esta es una vista de su estado real:
 *  - Llega con las respuestas del chat (evento `music`), con cada orden del reproductor y con una
 *    consulta periódica al BFF solo mientras hay un reproductor en pantalla y la pestaña está visible.
 *  - La consulta es más frecuente mientras carga o suena, y espaciada en pausa o detenida.
 *  - Entre consultas, la posición avanza en el navegador a partir de la última confirmada.
 *
 * Una única copia compartida (useState): cerrar y abrir el chat no la pierde, y al volver a montar un
 * reproductor se consulta al momento el estado real.
 */

const POLL_LOADING_MS = 1500
const POLL_PLAYING_MS = 4000
const POLL_IDLE_MS = 15000
const TICK_MS = 500

// Temporizadores del navegador (solo se crean en el cliente, desde onMounted del reproductor).
let pollTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

export function useLumiMusic() {
  const state = useState<LumiMusicState | null>('lumi-music-state', () => null)
  /** null = aún no se sabe; false = música apagada o asistente sin respuesta. */
  const available = useState<boolean | null>('lumi-music-available', () => null)
  const syncedAt = useState<number>('lumi-music-synced-at', () => 0)
  const now = useState<number>('lumi-music-now', () => 0)
  /** Orden en curso (deshabilita los botones hasta la confirmación). */
  const pending = useState<string | null>('lumi-music-pending', () => null)
  /** Aviso de la última orden que no salió bien (texto del asistente o del BFF). */
  const notice = useState<string | null>('lumi-music-notice', () => null)
  const viewers = useState<number>('lumi-music-viewers', () => 0)

  const auth = useAuth()
  const { request } = useAdminApi()
  const canRead = computed(() => auth.can(PERMISSIONS.MUSIC_READ))
  const canControl = computed(() => auth.can(PERMISSIONS.MUSIC_CONTROL))

  /** Hay algo cargado o sonando que mostrar en el reproductor. */
  const active = computed(() => {
    const status = state.value?.status
    return status === 'loading' || status === 'playing' || status === 'paused'
  })

  /** Posición mostrada: la confirmada más lo que lleva sonando desde entonces (solo si suena). */
  const position = computed(() => {
    const current = state.value
    if (!current) return 0
    if (current.status !== 'playing') return current.positionSeconds
    const elapsed = Math.max(0, (now.value - syncedAt.value) / 1000)
    const value = current.positionSeconds + elapsed
    return current.durationSeconds ? Math.min(value, current.durationSeconds) : value
  })

  function apply(next: LumiMusicState) {
    state.value = next
    available.value = true
    syncedAt.value = Date.now()
    now.value = syncedAt.value
  }

  async function refresh(): Promise<void> {
    if (!canRead.value) return
    try {
      const response = await request<LumiMusicStateResponse>('/api/admin/lumi/music/state')
      available.value = response.available
      if (response.state) apply(response.state)
      else if (!response.available) state.value = null
    } catch {
      // Sin conexión: se conserva el último estado confirmado; la próxima consulta lo corrige.
    }
  }

  /** Envía una orden y actualiza el reproductor con el estado que devuelve el servidor. */
  async function send(command: LumiMusicCommand): Promise<boolean> {
    if (!canControl.value || pending.value) return false
    pending.value = command.tool
    notice.value = null
    try {
      const response = await request<LumiMusicCommandResponse>('/api/admin/lumi/music/commands', {
        method: 'POST',
        body: { tool: command.tool, args: command.args ?? {} },
      })
      if (response.state) apply(response.state)
      if (!response.available) available.value = false
      if (!response.ok) notice.value = response.text
      schedule()
      return response.ok
    } catch (error) {
      notice.value = toUiError(error).message || 'No se pudo enviar la orden al reproductor.'
      return false
    } finally {
      pending.value = null
    }
  }

  function nextDelay(): number {
    const current = state.value
    if (current?.status === 'loading') return POLL_LOADING_MS
    if (current?.status === 'playing') {
      // Cerca del final se consulta antes para mostrar enseguida la siguiente canción.
      const left = current.durationSeconds ? current.durationSeconds - position.value : Infinity
      return left < 3 ? POLL_LOADING_MS : POLL_PLAYING_MS
    }
    return POLL_IDLE_MS
  }

  function schedule() {
    if (!import.meta.client) return
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    if (viewers.value <= 0) return
    pollTimer = setTimeout(async () => {
      if (document.visibilityState === 'visible') await refresh()
      schedule()
    }, nextDelay())
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      void refresh().then(schedule)
    }
  }

  /** Un reproductor aparece en pantalla: consulta el estado real y empieza a seguirlo. */
  function attach() {
    if (!import.meta.client) return
    viewers.value += 1
    if (viewers.value > 1) return
    void refresh().then(schedule)
    tickTimer = setInterval(() => {
      if (state.value?.status === 'playing') now.value = Date.now()
    }, TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
  }

  /** El último reproductor desaparece: deja de consultar (la música sigue en el servidor). */
  function detach() {
    if (!import.meta.client) return
    viewers.value = Math.max(0, viewers.value - 1)
    if (viewers.value > 0) return
    if (pollTimer) clearTimeout(pollTimer)
    if (tickTimer) clearInterval(tickTimer)
    pollTimer = null
    tickTimer = null
    document.removeEventListener('visibilitychange', onVisibility)
  }

  return { state, available, active, position, pending, notice, canRead, canControl, apply, refresh, send, attach, detach }
}
