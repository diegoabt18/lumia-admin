import type {
  LumiContextInput,
  LumiConversationDetail,
  LumiConversationSummary,
  LumiMessage,
  LumiStreamEvent,
} from '#shared/schemas/lumi'
import { LUMI_MESSAGE_MAX, lumiStreamEventSchema } from '#shared/schemas/lumi'
import { lumiContextForPath } from '~/features/lumi/utils/context'
import { parseSseBlock, splitSseBuffer } from '~/features/lumi/utils/sse'

/** Mensaje mostrado en el panel. Los estados transitorios solo existen en el navegador. */
export interface LumiViewMessage {
  key: string
  role: 'user' | 'assistant'
  content: string
  state: 'done' | 'pending' | 'streaming' | 'stopped' | 'failed'
}

export type LumiView = 'chat' | 'history'
export type LumiConnection = 'idle' | 'ok' | 'error'

const HISTORY_LIMIT = 50
const INTERRUPTED_MESSAGE = 'La respuesta se interrumpió. Inténtalo de nuevo.'

/**
 * Estado y acciones de Lumi. Vive en useState y no persiste en el navegador: el historial real
 * está en el Server, por usuario.
 *
 * `generation` invalida los streams en vuelo cuando el usuario cambia de conversación:
 * un stream tardío no debe escribir en otra conversación.
 * El turno solo se guarda en el Server si llega `done`. Al detener, la respuesta parcial se
 * conserva en pantalla, pero no entra en el historial.
 */
export function useLumi() {
  const open = useState<boolean>('lumi-open', () => false)
  const expanded = useState<boolean>('lumi-expanded', () => false)
  const minimized = useState<boolean>('lumi-minimized', () => false)
  const view = useState<LumiView>('lumi-view', () => 'chat')

  const messages = useState<LumiViewMessage[]>('lumi-messages', () => [])
  const conversationId = useState<string | null>('lumi-conversation-id', () => null)
  const draft = useState<string>('lumi-draft', () => '')
  const sending = useState<boolean>('lumi-sending', () => false)
  const connection = useState<LumiConnection>('lumi-connection', () => 'idle')
  const generation = useState<number>('lumi-generation', () => 0)
  const activeStream = useState<AbortController | null>('lumi-stream', () => null)

  const conversations = useState<LumiConversationSummary[]>('lumi-conversations', () => [])
  const historyLoading = useState<boolean>('lumi-history-loading', () => false)
  const historyError = useState<string | null>('lumi-history-error', () => null)

  const { request } = useAdminApi()
  const auth = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const route = useRoute()
  /** Pantalla actual, traducida a contexto de Lumi (null si no aplica). */
  const pageContext = computed<LumiContextInput | null>(() => lumiContextForPath(route.path))

  let keySeq = 0
  const nextKey = () => `m-${Date.now().toString(36)}-${(keySeq++).toString(36)}`

  function errorText(error: unknown): string {
    return toUiError(error).message || 'No se pudo completar la solicitud.'
  }

  function startNewGeneration() {
    generation.value += 1
    activeStream.value?.abort()
    activeStream.value = null
  }

  function newChat() {
    startNewGeneration()
    messages.value = []
    conversationId.value = null
    connection.value = 'idle'
    sending.value = false
    view.value = 'chat'
  }

  function replaceMessage(key: string, patch: Partial<Omit<LumiViewMessage, 'key' | 'role'>>) {
    messages.value = messages.value.map((m) => (m.key === key ? { ...m, ...patch } : m))
  }

  /**
   * Lee el stream SSE del BFF. Los errores previos al stream llegan como JSON y se lanzan con
   * la forma que entiende toUiError. Una sesión caducada cierra la sesión del admin.
   */
  async function streamChat(
    body: { message: string; conversationId?: string; context?: LumiContextInput },
    signal: AbortSignal,
    onEvent: (event: LumiStreamEvent) => void,
  ): Promise<void> {
    const response = await fetch('/api/admin/lumi/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
      const error = {
        statusCode: response.status,
        data: {
          code: data?.code ?? `HTTP_${response.status}`,
          message: data?.message ?? 'No se pudo completar la solicitud.',
        },
      }
      if (isSessionError(toUiError(error))) await auth.handleSessionLost()
      throw error
    }
    if (!response.body) throw new Error('Sin respuesta del asistente.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { blocks, rest } = splitSseBuffer(buffer)
        buffer = rest
        for (const block of blocks) {
          const parsed = parseSseBlock(block)
          if (!parsed) continue
          let json: unknown
          try {
            json = JSON.parse(parsed.data)
          } catch {
            continue
          }
          const event = lumiStreamEventSchema.safeParse({
            type: parsed.event,
            ...(typeof json === 'object' && json !== null ? json : {}),
          })
          if (event.success) onEvent(event.data)
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async function send(text?: string) {
    const content = (text ?? draft.value).trim()
    if (!content || sending.value || content.length > LUMI_MESSAGE_MAX) return

    const gen = generation.value
    const pendingKey = nextKey()
    messages.value = [
      ...messages.value,
      { key: nextKey(), role: 'user', content, state: 'done' },
      { key: pendingKey, role: 'assistant', content: '', state: 'pending' },
    ]
    if (text === undefined) draft.value = ''
    sending.value = true

    // El contexto se toma al enviar: refleja la pantalla en la que el administrador escribió.
    const context = pageContext.value ?? undefined
    const controller = new AbortController()
    activeStream.value = controller
    let answer = ''
    let finished = false

    try {
      await streamChat(
        {
          message: content,
          ...(conversationId.value ? { conversationId: conversationId.value } : {}),
          ...(context ? { context } : {}),
        },
        controller.signal,
        (event) => {
          if (gen !== generation.value) return
          if (event.type === 'token') {
            answer += event.text
            replaceMessage(pendingKey, { content: answer, state: 'streaming' })
          } else if (event.type === 'done') {
            finished = true
            conversationId.value = event.conversationId
            replaceMessage(pendingKey, { content: answer, state: 'done' })
            connection.value = 'ok'
          } else if (event.type === 'error') {
            finished = true
            replaceMessage(pendingKey, { content: event.message, state: 'failed' })
            connection.value = 'error'
          }
        },
      )
      if (gen === generation.value && !finished) {
        replaceMessage(pendingKey, { content: answer || INTERRUPTED_MESSAGE, state: 'failed' })
        connection.value = 'error'
      }
    } catch (error) {
      if (gen !== generation.value) return
      if (controller.signal.aborted) {
        replaceMessage(pendingKey, { content: answer, state: 'stopped' })
      } else {
        replaceMessage(pendingKey, { content: errorText(error), state: 'failed' })
        connection.value = 'error'
      }
    } finally {
      if (activeStream.value === controller) activeStream.value = null
      if (gen === generation.value) sending.value = false
    }
  }

  /** Detiene la respuesta en curso. El Server cancela la generación y no guarda el turno. */
  function stop() {
    activeStream.value?.abort()
  }

  /** Reintenta la última pregunta que falló: quita la respuesta fallida y vuelve a enviar. */
  async function retryLast() {
    if (sending.value) return
    const list = messages.value
    const failedIndex = list.findIndex((m) => m.state === 'failed')
    if (failedIndex < 1) return
    const question = list[failedIndex - 1]
    if (!question || question.role !== 'user') return
    messages.value = list.filter((_, i) => i !== failedIndex - 1 && i !== failedIndex)
    await send(question.content)
  }

  async function loadHistory() {
    if (historyLoading.value) return
    historyLoading.value = true
    historyError.value = null
    try {
      conversations.value = await request<LumiConversationSummary[]>('/api/admin/lumi/conversations', {
        query: { limit: HISTORY_LIMIT, offset: 0 },
      })
    } catch (error) {
      historyError.value = errorText(error)
    } finally {
      historyLoading.value = false
    }
  }

  async function openConversation(id: string) {
    startNewGeneration()
    const gen = generation.value
    sending.value = false
    try {
      const detail = await request<LumiConversationDetail>(`/api/admin/lumi/conversations/${id}`)
      if (gen !== generation.value) return
      messages.value = detail.messages.map((m: LumiMessage) => ({
        key: `h-${m.id}`,
        role: m.role,
        content: m.content,
        state: 'done',
      }))
      conversationId.value = detail.id
      connection.value = 'idle'
      view.value = 'chat'
    } catch (error) {
      toast.error('No se pudo abrir la conversación', errorText(error))
    }
  }

  async function deleteConversation(id: string) {
    const ok = await confirm({
      title: '¿Eliminar esta conversación?',
      description: 'Se borrarán sus mensajes. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await request<{ ok: true }>(`/api/admin/lumi/conversations/${id}`, { method: 'DELETE' })
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (conversationId.value === id) newChat()
      toast.success('Conversación eliminada')
    } catch (error) {
      toast.error('No se pudo eliminar la conversación', errorText(error))
    }
  }

  /** Limpia todo al cambiar de usuario o cerrar sesión: nada de una sesión pasa a otra. */
  function reset() {
    newChat()
    conversations.value = []
    historyError.value = null
    draft.value = ''
    open.value = false
    expanded.value = false
    minimized.value = false
    view.value = 'chat'
  }

  function toggleOpen() {
    open.value = !open.value
    if (open.value) minimized.value = false
  }

  function close() {
    open.value = false
  }

  return {
    open,
    expanded,
    minimized,
    view,
    messages,
    conversationId,
    draft,
    sending,
    connection,
    conversations,
    historyLoading,
    historyError,
    pageContext,
    send,
    stop,
    retryLast,
    newChat,
    loadHistory,
    openConversation,
    deleteConversation,
    reset,
    toggleOpen,
    close,
  }
}
