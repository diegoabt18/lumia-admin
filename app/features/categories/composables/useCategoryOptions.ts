import type { CategoryList } from '#shared/schemas/categories'

/**
 * Opciones de categoría para selectores (hasta 100, ordenadas por nombre en el Server).
 * Si existieran más de 100 categorías, `truncated` lo indica para no ocultarlo en silencio.
 */
export function useCategoryOptions() {
  const { request } = useAdminApi()
  const { data, status, error } = useAsyncData('admin-category-options', () =>
    request<CategoryList>('/api/admin/categories', { query: { limit: 100 } }),
  )

  const options = computed(() =>
    (data.value?.items ?? []).map((c) => ({ value: c.slug, label: c.name })),
  )
  const truncated = computed(() => (data.value?.pagination.total ?? 0) > (data.value?.items.length ?? 0))
  const loading = computed(() => status.value === 'pending')

  return { options, truncated, loading, error }
}
