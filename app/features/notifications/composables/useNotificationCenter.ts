import {
  notificationItemSchema,
  notificationListResponseSchema,
  reviewNotificationResponseSchema,
  markNotificationsReadResponseSchema,
  type NotificationItem,
} from '#shared/schemas/notifications'

const PAGE_SIZE = 20
const MAX_ITEMS = 50

/**
 * Centro de notificaciones del admin. El estado vive en useState (compartido y aislado por
 * petición en SSR). La conexión en tiempo real solo se abre en el navegador: EventSource reintenta
 * sola, y cada "ready" del stream vuelve a cargar la lista para no perder avisos mientras estuvo caída.
 */
export function useNotificationCenter() {
  const api = useAdminApi()
  const items = useState<NotificationItem[]>('notifications:items', () => [])
  const unreadCount = useState<number>('notifications:unread', () => 0)
  const loading = useState<boolean>('notifications:loading', () => false)
  const error = useState<string | null>('notifications:error', () => null)
  let source: EventSource | null = null

  async function load(): Promise<void> {
    loading.value = true
    try {
      const res = notificationListResponseSchema.parse(
        await api.request<unknown>('/api/notifications', { query: { page: 1, limit: PAGE_SIZE } }),
      )
      items.value = res.items
      unreadCount.value = res.unreadCount
      error.value = null
    } catch {
      error.value = 'No se pudieron cargar las notificaciones.'
    } finally {
      loading.value = false
    }
  }

  function prepend(item: NotificationItem) {
    if (items.value.some((existing) => existing.id === item.id)) return
    items.value = [item, ...items.value].slice(0, MAX_ITEMS)
    if (!item.read) unreadCount.value += 1
  }

  async function markRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const res = markNotificationsReadResponseSchema.parse(
      await api.request<unknown>('/api/notifications/read', { method: 'PATCH', body: { ids } }),
    )
    const set = new Set(ids)
    items.value = items.value.map((item) => (set.has(item.id) ? { ...item, read: true } : item))
    unreadCount.value = res.unreadCount
  }

  async function markReviewed(item: NotificationItem): Promise<void> {
    reviewNotificationResponseSchema.parse(
      await api.request<unknown>(`/api/admin/lumi/automation/notifications/${item.id}/review`, { method: 'POST' }),
    )
    // La revisión también deja la notificación leída en el Server: se recarga para tener el contador exacto.
    await load()
  }

  function connect(): void {
    if (!import.meta.client || source || typeof EventSource === 'undefined') return
    const stream = new EventSource('/api/notifications/stream')
    source = stream
    stream.addEventListener('ready', () => {
      void load()
    })
    stream.addEventListener('notification', (event) => {
      try {
        const parsed = notificationItemSchema.safeParse(JSON.parse((event as MessageEvent<string>).data))
        if (parsed.success) prepend(parsed.data)
      } catch {
        // Evento malformado: se ignora; la lista se recupera en el próximo "ready".
      }
    })
    stream.onerror = () => {
      // Con readyState CLOSED el navegador no reintenta (p. ej. sesión caducada): se reabre al recargar.
      if (stream.readyState === EventSource.CLOSED) {
        source = null
      }
    }
  }

  function disconnect(): void {
    source?.close()
    source = null
  }

  return { items, unreadCount, loading, error, load, markRead, markReviewed, connect, disconnect }
}
