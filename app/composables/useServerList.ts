import type { AdminPaginationMeta } from '#shared/contracts/api'
import type { useTableQuery } from './useTableQuery'

type TableQuery = ReturnType<typeof useTableQuery>
type ExtraQuery = Record<string, string | number | boolean | undefined>

/**
 * Lista paginada en el Server a través del BFF. Se recarga cuando cambian página,
 * tamaño, búsqueda o los filtros extra. Conserva los datos previos mientras recarga.
 */
export function useServerList<T>(
  key: string,
  url: `/api/${string}`,
  table: TableQuery,
  extraQuery?: ComputedRef<ExtraQuery>,
) {
  const { request } = useAdminApi()

  const { data, status, error, refresh } = useAsyncData<{ items: T[]; pagination: AdminPaginationMeta }>(
    key,
    () =>
      request(url, {
        query: {
          page: table.page.value,
          limit: table.limit.value,
          search: table.search.value || undefined,
          ...(extraQuery?.value ?? {}),
        },
      }),
    { watch: [table.page, table.limit, table.search, ...(extraQuery ? [extraQuery] : [])] },
  )

  const rows = computed<T[]>(() => data.value?.items ?? [])
  const pagination = computed(() => data.value?.pagination ?? null)
  const loading = computed(() => status.value === 'pending')
  const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

  return { rows, pagination, loading, errorMessage, refresh }
}
