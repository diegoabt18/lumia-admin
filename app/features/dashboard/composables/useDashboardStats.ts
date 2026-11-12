import type { DashboardStats } from '#shared/schemas/dashboard'

/** Estadísticas reales del Server (GET /api/admin/dashboard vía BFF). */
export function useDashboardStats() {
  const { request } = useAdminApi()

  const { data, status, error, refresh } = useAsyncData<DashboardStats>(
    'dashboard-stats',
    () => request<DashboardStats>('/api/admin/dashboard'),
  )

  const uiError = computed(() => (error.value ? toUiError(error.value) : null))
  const loading = computed(() => status.value === 'pending' || status.value === 'idle')

  return { stats: data, loading, error: uiError, refresh }
}
