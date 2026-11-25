import type { Ref } from 'vue'
import type { DesktopDevice } from '#shared/schemas/desktop'

/**
 * Polling para estado del dispositivo: detectar cambios de conectividad.
 * - Polling cada 30s (reducido desde 10s)
 * - Respeta visibilidad de pestaña
 * - Se limpia al desmontar
 */
export function useDevicePolling(deviceId: Ref<string>) {
  const { request } = useAdminApi()

  const { data: device, status, error, refresh } = useAsyncData(
    () => `admin-desktop-device-${deviceId.value}`,
    () => request<DesktopDevice>(`/api/admin/desktop/devices/${deviceId.value}`),
  )

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
    device,
    loading,
    error: errorMessage,
    refresh,
  }
}
