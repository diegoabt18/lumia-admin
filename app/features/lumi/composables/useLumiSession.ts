import {
  lumiPresenceSchema,
  lumiSessionConversationEventSchema,
  lumiSessionReadySchema,
} from '#shared/schemas/lumi'

/** Tras un cierre definitivo (401/403, Server caído) se vuelve a intentar con esta espera. */
const RETRY_MS = 30_000

/**
 * Canal de sesión de Lumi (Lumi 2.0, Fase 1.3): mantiene esta pestaña al día con lo que pasa en los
 * otros dispositivos del usuario (LumiChat, otras pestañas). Los eventos no traen texto: solo dicen
 * qué conversación cambió o se borró y qué está haciendo Lumi; lo demás se recarga por HTTP.
 *
 * Solo en el navegador. EventSource reconecta sola cuando el Server cierra el stream (caducidad del
 * token); cada `ready` recupera lo ocurrido sin conexión recargando la conversación abierta y el
 * historial cargado.
 */
export function useLumiSession() {
  const lumi = useLumi()
  const toast = useToast()
  let source: EventSource | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  function parse<T>(event: Event, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }): T | null {
    try {
      const parsed = schema.safeParse(JSON.parse((event as MessageEvent<string>).data))
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  }

  function refreshHistory() {
    if (lumi.conversations.value.length > 0 || lumi.view.value === 'history') void lumi.loadHistory()
  }

  function connect(): void {
    if (!import.meta.client || source || typeof EventSource === 'undefined') return
    disposed = false
    const stream = new EventSource('/api/lumi/session/stream')
    source = stream

    stream.addEventListener('ready', (event) => {
      const ready = parse(event, lumiSessionReadySchema)
      if (ready) lumi.remotePresence.value = ready.presence
      if (lumi.conversationId.value) void lumi.syncConversation(lumi.conversationId.value)
      refreshHistory()
    })
    stream.addEventListener('presence', (event) => {
      const presence = parse(event, lumiPresenceSchema)
      if (presence) lumi.remotePresence.value = presence
    })
    stream.addEventListener('conversation.updated', (event) => {
      const data = parse(event, lumiSessionConversationEventSchema)
      if (!data) return
      void lumi.syncConversation(data.conversationId)
      refreshHistory()
    })
    stream.addEventListener('conversation.deleted', (event) => {
      const data = parse(event, lumiSessionConversationEventSchema)
      if (data && lumi.forgetConversation(data.conversationId)) {
        toast.info('Conversación eliminada', 'Se eliminó desde otro dispositivo.')
      }
    })
    stream.onerror = () => {
      // CLOSED: el navegador ya no reintenta (sesión caducada, sin permiso o BFF caído).
      if (stream.readyState !== EventSource.CLOSED) return
      source = null
      lumi.remotePresence.value = null
      if (!disposed && !retry) {
        retry = setTimeout(() => {
          retry = null
          connect()
        }, RETRY_MS)
      }
    }
  }

  function disconnect(): void {
    disposed = true
    if (retry) clearTimeout(retry)
    retry = null
    source?.close()
    source = null
  }

  return { connect, disconnect }
}
