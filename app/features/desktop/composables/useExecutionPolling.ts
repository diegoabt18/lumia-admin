import type { Ref } from 'vue'
import type { DesktopExecution } from '#shared/schemas/desktop'

/**
 * Polling inteligente para executions: solo consulta si hay operaciones activas.
 * - Inicialmente: fetch al montar
 * - Si hay activas (pending, running): polling cada 5s
 * - Si no hay activas: sin polling automático (refetch manual)
 * - Respeta visibilidad de pestaña
 */
export function useExecutionPolling(deviceId: Ref<string>) {
  const { request } = useAdminApi()

  const { data: executionsData, status, error, refresh } = useAsyncData(
    () => `admin-desktop-executions-${deviceId.value}`,
    () => request<{ items: DesktopExecution[] }>(`/api/admin/desktop/devices/${deviceId.value}/executions`),
  )

  const executions = computed(() => executionsData.value?.items ?? [])
  const loading = computed(() => status.value === 'pending')
  const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

  // Detecta si hay ejecuciones activas que requieren seguimiento
  const hasActiveExecutions = computed(() =>
    executions.value.some((e) => ['pending', 'running'].includes(e.status)),
  )

  // Polling inteligente: solo si hay ejecutándose, respeta visibilidad de pestaña
  let pollingTimer: ReturnType<typeof setInterval> | undefined
  const startPolling = () => {
    if (pollingTimer) return
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    pollingTimer = setInterval(tick, 5_000) // 5s mientras hay activas
  }
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = undefined
    }
  }

  // Vigila si hay executions activas para activar/desactivar polling
  watch(
    hasActiveExecutions,
    (active) => {
      if (active) startPolling()
      else stopPolling()
    },
  )

  // Respeta visibilidad de pestaña: pausa polling cuando se oculta
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && hasActiveExecutions.value) {
      void refresh()
      startPolling()
    } else {
      stopPolling()
    }
  }

  onMounted(() => {
    // Fetch inicial al montar
    void refresh()
    // Inicia polling solo si ya hay activas
    if (hasActiveExecutions.value) startPolling()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    stopPolling()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    executions,
    loading,
    error: errorMessage,
    refresh,
    hasActiveExecutions,
  }
}
