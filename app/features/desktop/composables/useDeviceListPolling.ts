import type { DesktopDeviceListResponse } from '#shared/schemas/desktop'

/**
 * Polling para listado de dispositivos: detectar nuevos dispositivos y cambios de estado.
 * - Polling cada 30s (reducido desde 10s)
 * - Respeta visibilidad de pestaña
 * - Se limpia al desmontar
 */
export function useDeviceListPolling() {
  const { request } = useAdminApi()

  const { data, status, error, refresh } = useAsyncData('admin-desktop-devices', () =>
    request<DesktopDeviceListResponse>('/api/admin/desktop/devices'),
  )

  // Activos primero; los revocados quedan al final como historial.
  const devices = computed(() =>
    [...(data.value?.items ?? [])].sort((a, b) => Number(a.status === 'revoked') - Number(b.status === 'revoked')),
  )
  const enabled = computed(() => data.value?.enabled ?? true)
  const loading = computed(() => status.value === 'pending')
  const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

  let timer: ReturnType<typeof setInterval> | undefined
  const tick = () => {
    if (document.visibilityState === 'visible') void refresh()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void refresh()
  }

  onMounted(() => {
    // Intervalo de 30s (reducido desde 10s)
    timer = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return {
    devices,
    enabled,
    loading,
    error: errorMessage,
    refresh,
  }
}
