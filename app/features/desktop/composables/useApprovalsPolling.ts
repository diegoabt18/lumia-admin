import type { DesktopApproval } from '#shared/schemas/desktop'

/**
 * Polling centralizado para approvals: evita duplicaciones entre páginas.
 * Ambas páginas (index y [id]) comparten la misma estrategia usando el mismo key.
 * - Polling cada 10s mientras la pestaña es visible
 * - Se pausa al cambiar de pestaña
 * - Se limpia al desmontar
 */
export function useApprovalsPolling() {
  const { request } = useAdminApi()

  const { data: approvalsData, status, error, refresh } = useAsyncData(
    'admin-desktop-approvals',
    () => request<{ items: DesktopApproval[] }>('/api/admin/desktop/approvals'),
  )

  const approvals = computed(() => approvalsData.value?.items ?? [])
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
    timer = setInterval(tick, 10_000)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return {
    approvals,
    loading,
    error: errorMessage,
    refresh,
  }
}
