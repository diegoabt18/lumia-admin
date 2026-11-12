import type { H3Event } from 'h3'
import { CALENDAR_DATE_PATTERN } from '#shared/schemas/audit'
import { zonedLocalToIso } from '#shared/utils/datetime'
import { throwBffError } from './upstream'

/**
 * Rango de fechas de los filtros de auditoría: `from` y `to` como días (YYYY-MM-DD) en la hora de
 * la tienda, convertidos a instantes UTC (inicio del primer día y final del último).
 */
export function readDateRange(event: H3Event): { from?: string; to?: string } {
  const query = getQuery(event)
  const first = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim()
  const timeZone = useRuntimeConfig(event).public.storeTimezone

  const parse = (raw: string, endOfDay: boolean): string | undefined => {
    if (!raw) return undefined
    if (!CALENDAR_DATE_PATTERN.test(raw)) {
      throwBffError(422, { code: 'INVALID_DATE', message: 'Fecha inválida. Usa el formato AAAA-MM-DD.' })
    }
    const iso = zonedLocalToIso(`${raw}T${endOfDay ? '23:59' : '00:00'}`, timeZone)
    if (!iso) throwBffError(422, { code: 'INVALID_DATE', message: 'Fecha inválida.' })
    return endOfDay ? new Date(Date.parse(iso) + 59_999).toISOString() : iso
  }

  const from = parse(first(query.from), false)
  const to = parse(first(query.to), true)
  if (from && to && from > to) {
    throwBffError(422, { code: 'INVALID_DATE_RANGE', message: 'La fecha inicial es posterior a la final.' })
  }
  return { from, to }
}
