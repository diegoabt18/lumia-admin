import type { NotificationItem } from '#shared/schemas/notifications'

/** Ids de avisos ya mostrados en este navegador. Se comparte entre pestañas del mismo origen. */
export const LUMI_ANNOUNCED_STORAGE_KEY = 'lumia-admin:lumi-announced-reviews:v1'
const ANNOUNCED_LIMIT = 200

/** Tareas del asistente que aún no se han confirmado. Las confirmadas dejan de contar. */
function isPendingReview(item: NotificationItem): boolean {
  return item.type === 'lumi_automation' && !item.reviewed
}

function readAnnounced(): string[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(LUMI_ANNOUNCED_STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeAnnounced(ids: string[]) {
  try {
    window.localStorage.setItem(LUMI_ANNOUNCED_STORAGE_KEY, JSON.stringify(ids.slice(-ANNOUNCED_LIMIT)))
  } catch {
    // Sin almacenamiento, la burbuja puede repetirse tras recargar. No es un error funcional.
  }
}

/**
 * Pendientes de revisión del asistente. Los datos vienen del centro de notificaciones (lista inicial
 * y tiempo real por SSE), así que el contador se recupera al recargar sin un endpoint nuevo.
 * El backend es la fuente de verdad: confirmar usa el endpoint de revisión existente.
 * La burbuja se muestra una sola vez por aviso en este navegador, no una vez por cada mensaje.
 */
export function useLumiReviews() {
  const center = useNotificationCenter()
  const lumi = useLumi()
  const toast = useToast()
  const announced = useState<string[]>('lumi-reviews-announced', () => [])
  const confirmingId = useState<string | null>('lumi-reviews-confirming', () => null)

  const pending = computed(() => center.items.value.filter(isPendingReview))
  const pendingCount = computed(() => pending.value.length)
  const unannounced = computed(() => {
    const seen = new Set(announced.value)
    return pending.value.filter((item) => !seen.has(item.id))
  })
  const bubbleVisible = computed(() => unannounced.value.length > 0 && !lumi.open.value)

  function markAnnounced(ids: string[]) {
    if (ids.length === 0) return
    announced.value = [...new Set([...announced.value, ...ids])]
    writeAnnounced(announced.value)
  }

  function onStorage(event: StorageEvent) {
    if (event.key === LUMI_ANNOUNCED_STORAGE_KEY) announced.value = readAnnounced()
  }

  /** Carga los ids ya mostrados y escucha los cambios de otras pestañas. Llamar al montar el widget. */
  function init() {
    announced.value = readAnnounced()
    window.addEventListener('storage', onStorage)
  }

  function dispose() {
    window.removeEventListener('storage', onStorage)
  }

  /** Abre Lumi en la lista de pendientes y da por mostrados los avisos actuales. */
  function openReviews() {
    markAnnounced(unannounced.value.map((item) => item.id))
    lumi.open.value = true
    lumi.minimized.value = false
    lumi.view.value = 'review'
  }

  /** Cierra la burbuja sin abrir la lista. Los pendientes siguen en el contador. */
  function dismiss() {
    markAnnounced(unannounced.value.map((item) => item.id))
  }

  async function confirm(item: NotificationItem) {
    if (confirmingId.value) return
    confirmingId.value = item.id
    try {
      await center.markReviewed(item)
      toast.success('Revisión confirmada')
    } catch (error) {
      toast.error('No se pudo confirmar la revisión', toUiError(error).message)
    } finally {
      confirmingId.value = null
    }
  }

  return {
    pending,
    pendingCount,
    bubbleVisible,
    confirmingId,
    init,
    dispose,
    openReviews,
    dismiss,
    confirm,
  }
}
