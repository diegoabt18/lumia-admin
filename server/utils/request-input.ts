import type { H3Event } from 'h3'
import type { z } from 'zod'
import { OBJECT_ID_PATTERN, SKU_PATTERN } from '#shared/schemas/common'
import { throwBffError, UpstreamError } from './upstream'

/**
 * Lectura validada de parámetros de ruta y query para los handlers del BFF.
 * Nunca se reenvía el query crudo del navegador al Server.
 */

export function readObjectIdParam(event: H3Event, name = 'id'): string {
  const value = getRouterParam(event, name, { decode: true }) ?? ''
  if (!OBJECT_ID_PATTERN.test(value)) {
    throwBffError(400, { code: 'INVALID_ID', message: 'Identificador inválido.' })
  }
  return value
}

export function readSkuParam(event: H3Event, name = 'sku'): string {
  const value = getRouterParam(event, name, { decode: true }) ?? ''
  if (!SKU_PATTERN.test(value)) {
    throwBffError(400, { code: 'INVALID_SKU', message: 'SKU inválido.' })
  }
  return value
}

export type ListQuery = {
  page: number
  limit: number
  search: string | undefined
}

/**
 * page/limit/search acotados.
 * `escapeSearch`: los listados de categorías, productos y pedidos del Server usan `search`
 * como expresión regular sin escapar; se escapa aquí para que la búsqueda sea literal
 * (y no se puedan enviar patrones costosos). Inventario ya escapa en el Server.
 */
export function readListQuery(
  event: H3Event,
  options: { allowedLimits: readonly number[]; escapeSearch: boolean },
): ListQuery {
  const query = getQuery(event)
  const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

  const pageRaw = Number.parseInt(String(first(query.page) ?? '1'), 10)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 && pageRaw <= 10_000 ? pageRaw : 1

  const limitRaw = Number.parseInt(String(first(query.limit) ?? ''), 10)
  const limit = options.allowedLimits.includes(limitRaw) ? limitRaw : options.allowedLimits[0]!

  const rawSearch = String(first(query.search) ?? '').trim().slice(0, 120)
  const search = rawSearch
    ? options.escapeSearch
      ? rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : rawSearch
    : undefined

  return { page, limit, search }
}

/** Valida un parámetro de ruta con un esquema Zod; responde 400 si no es válido. */
export function readValidatedParam<T extends z.ZodTypeAny>(event: H3Event, name: string, schema: T): z.infer<T> {
  const parsed = schema.safeParse(getRouterParam(event, name, { decode: true }))
  if (!parsed.success) {
    throwBffError(400, { code: 'INVALID_ID', message: 'Identificador inválido.' })
  }
  return parsed.data
}

/** Valida el query string con un esquema Zod; responde 400 si no es válido. Nunca reenvía el crudo. */
export function readQueryOrThrow<T extends z.ZodTypeAny>(event: H3Event, schema: T): z.infer<T> {
  const parsed = schema.safeParse(getQuery(event))
  if (!parsed.success) {
    throwBffError(400, { code: 'INVALID_INPUT', message: 'Parámetros no válidos.' })
  }
  return parsed.data
}

/** Valida la respuesta del Server; si la forma no coincide responde 502 en vez de mostrar datos mal leídos. */
export function parseUpstream<T extends z.ZodTypeAny>(schema: T, data: unknown, context: string): z.infer<T> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(`[bff] respuesta inesperada del Server en ${context}`, JSON.stringify(parsed.error.flatten()))
    throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'El servidor devolvió datos con un formato inesperado.')
  }
  return parsed.data
}
