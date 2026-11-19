import { PERMISSIONS } from '#shared/auth/permissions'
import {
  lumiMusicStreamStateSchema,
  lumiMusicStreamUnavailableSchema,
  type LumiMusicCommand,
  type LumiMusicCommandResponse,
  type LumiMusicState,
  type LumiMusicStateResponse,
} from '#shared/schemas/lumi-music'

/**
 * Estado del reproductor de música de Lumi en el navegador.
 *
 * La música suena en el servidor (nunca en el navegador). Esta es una vista de su estado real:
 *  - Una única conexión SSE por pestaña (`/api/admin/lumi/music/stream`) mientras el panel de Lumi
 *    está abierto y la pestaña visible. El Server la reparte con una sola conexión al asistente.
 *    Solo llega un evento cuando algo cambia de verdad: no hay consultas periódicas.
 *  - Si el stream se cae, consulta de respaldo cada 10 s (GET /state) hasta que vuelve.
 *  - La barra de progreso avanza en el navegador desde la última posición confirmada; cuando hay
 *    un cambio real (pausa, salto, otra canción) el servidor envía el estado y se corrige.
 *  - Las órdenes no cambian nada en pantalla hasta que el servidor responde con el estado nuevo.
 *
 * Una única copia compartida (useState): cerrar el panel no pierde el estado (ni detiene la música),
 * y al volver a abrirlo el stream entrega primero el estado real.
 */

const FALLBACK_POLL_MS = 10_000
const RECONNECT_MS = 10_000
const TICK_MS = 500

export type LumiMusicConnection = 'off' | 'connecting' | 'live' | 'fallback'
export type LumiPanelTab = 'chat' | 'music'

// Recursos del navegador (solo en el cliente; uno por pestaña aunque haya varios componentes).
let source: EventSource | null = null
let fallbackTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null
let visibilityHandler: (() => void) | null = null

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
  const connection = useState<LumiMusicConnection>('lumi-music-connection', () => 'off')
  /** Pestaña del panel de Lumi (Chat o Música). */
  const tab = useState<LumiPanelTab>('lumi-panel-tab', () => 'chat')

  const auth = useAuth()
  const { request } = useAdminApi()
  const canRead = computed(() => auth.can(PERMISSIONS.MUSIC_READ))
  const canControl = computed(() => auth.can(PERMISSIONS.MUSIC_CONTROL))

  /** Hay algo cargado o sonando que mostrar en el reproductor. */
  const active = computed(() => {
    const status = state.value?.status
    return status === 'loading' || status === 'playing' || status === 'paused'
  })
  const playing = computed(() => state.value?.status === 'playing')

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
    // Un estado más antiguo que el mostrado (llegó tarde) no lo reemplaza.
    const shown = state.value
    if (shown && next.version > 0 && shown.version > next.version && shown.generation === next.generation) return
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
      return response.ok
    } catch (error) {
      notice.value = toUiError(error).message || 'No se pudo enviar la orden al reproductor.'
      return false
    } finally {
      pending.value = null
    }
  }

  function openCenter() {
    tab.value = 'music'
  }

  /* ───────── Conexión en tiempo real ───────── */

  function stopFallback() {
    if (fallbackTimer) clearInterval(fallbackTimer)
    fallbackTimer = null
  }

  function startFallback() {
    if (fallbackTimer) return
    connection.value = 'fallback'
    fallbackTimer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, FALLBACK_POLL_MS)
  }

  function closeStream() {
    source?.close()
    source = null
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function openStream() {
    if (source || typeof EventSource === 'undefined') {
      if (typeof EventSource === 'undefined') startFallback()
      return
    }
    connection.value = 'connecting'
    const stream = new EventSource('/api/admin/lumi/music/stream')
    source = stream
    stream.addEventListener('ready', () => {
      connection.value = 'live'
      stopFallback()
    })
    stream.addEventListener('state', (event) => {
      const parsed = lumiMusicStreamStateSchema.safeParse(safeJson((event as MessageEvent<string>).data))
      if (parsed.success) apply(parsed.data.state)
    })
    stream.addEventListener('unavailable', (event) => {
      if (lumiMusicStreamUnavailableSchema.safeParse(safeJson((event as MessageEvent<string>).data)).success) {
        available.value = false
      }
    })
    stream.onerror = () => {
      if (source !== stream) return
      // Mientras el navegador reintenta solo, el estado se mantiene con la consulta de respaldo.
      startFallback()
      if (stream.readyState === EventSource.CLOSED) {
        // Cerrado del todo (p. ej. sesión caducada o 403): se reintenta más tarde, sin bucles rápidos.
        source = null
        if (!reconnectTimer && viewers.value > 0) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            if (viewers.value > 0 && document.visibilityState === 'visible') openStream()
          }, RECONNECT_MS)
        }
      }
    }
  }

  /** El panel de Lumi se abre: un único stream por pestaña, solo mientras se ve. */
  function attach() {
    if (!import.meta.client || !canRead.value) return
    viewers.value += 1
    if (viewers.value > 1) return
    if (document.visibilityState === 'visible') openStream()
    tickTimer = setInterval(() => {
      if (state.value?.status === 'playing') now.value = Date.now()
    }, TICK_MS)
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        openStream() // al volver, el stream entrega primero el estado real
      } else {
        closeStream() // pestaña oculta: ninguna conexión ni consulta
        stopFallback()
        connection.value = 'off'
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  /** El panel se cierra: se cierra el stream (la música sigue en el servidor). */
  function detach() {
    if (!import.meta.client || viewers.value <= 0) return
    viewers.value -= 1
    if (viewers.value > 0) return
    closeStream()
    stopFallback()
    if (tickTimer) clearInterval(tickTimer)
    tickTimer = null
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
    connection.value = 'off'
  }

  return {
    state,
    available,
    active,
    playing,
    position,
    pending,
    notice,
    connection,
    tab,
    canRead,
    canControl,
    apply,
    refresh,
    send,
    openCenter,
    attach,
    detach,
  }
}

function safeJson(data: string): unknown {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
