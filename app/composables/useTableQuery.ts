import type { SortState } from '~/types/ui'

export interface TableQueryOptions {
  defaultLimit?: number
  allowedLimits?: readonly number[]
  /** Claves por las que se permite ordenar (lista blanca: no se reenvía lo que llegue por URL). */
  sortableKeys?: readonly string[]
  defaultSort?: SortState | null
}

/**
 * Estado de una tabla administrativa (página, tamaño, búsqueda, orden) sincronizado con la URL.
 * Valida y acota lo que llega por query string antes de usarlo; el BFF vuelve a validar.
 * Pensado para paginación del lado del Server (AdminPaginationMeta).
 */
export function useTableQuery(options: TableQueryOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const allowedLimits = options.allowedLimits ?? [10, 25, 50]
  const defaultLimit = options.defaultLimit ?? allowedLimits[0] ?? 10
  const sortableKeys = new Set(options.sortableKeys ?? [])

  const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)
  const toInt = (value: unknown) => Number.parseInt(String(first(value) ?? ''), 10)

  const page = computed(() => {
    const n = toInt(route.query.page)
    return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : 1
  })

  const limit = computed(() => {
    const n = toInt(route.query.limit)
    return allowedLimits.includes(n) ? n : defaultLimit
  })

  const search = computed(() => String(first(route.query.q) ?? '').trim().slice(0, 120))

  const sort = computed<SortState | null>(() => {
    const key = String(first(route.query.sort) ?? '')
    const dir = String(first(route.query.dir) ?? '')
    if (key && sortableKeys.has(key)) return { key, direction: dir === 'desc' ? 'desc' : 'asc' }
    return options.defaultSort ?? null
  })

  function update(patch: Record<string, string | number | undefined>) {
    const query = { ...route.query, ...patch }
    for (const [k, v] of Object.entries(query)) if (v === undefined || v === '') delete query[k]
    void router.replace({ query })
  }

  return {
    page,
    limit,
    search,
    sort,
    setPage: (value: number) => update({ page: value > 1 ? value : undefined }),
    setLimit: (value: number) => update({ limit: value, page: undefined }),
    setSearch: (value: string) => update({ q: value || undefined, page: undefined }),
    setSort: (value: SortState | null) =>
      update({ sort: value?.key, dir: value?.direction, page: undefined }),
  }
}
