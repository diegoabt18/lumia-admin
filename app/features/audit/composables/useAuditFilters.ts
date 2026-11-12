import { CALENDAR_DATE_PATTERN } from '#shared/schemas/audit'

/**
 * Filtros de fecha (y evento) de la auditoría guardados en la URL, como el resto de listados.
 * Valores inválidos en la URL se ignoran; el BFF vuelve a validar.
 */
export function useAuditFilters() {
  const route = useRoute()
  const router = useRouter()

  const read = (key: string) => {
    const v = route.query[key]
    return typeof v === 'string' ? v : ''
  }
  const from = computed(() => (CALENDAR_DATE_PATTERN.test(read('from')) ? read('from') : ''))
  const to = computed(() => (CALENDAR_DATE_PATTERN.test(read('to')) ? read('to') : ''))
  const event = computed(() => read('event'))

  function patch(values: Record<string, string>) {
    const query: Record<string, unknown> = { ...route.query, page: undefined }
    for (const [k, v] of Object.entries(values)) query[k] = v || undefined
    void router.replace({ query: query as typeof route.query })
  }

  return { from, to, event, setRange: (r: { from: string; to: string }) => patch(r), setEvent: (e: string) => patch({ event: e }) }
}
