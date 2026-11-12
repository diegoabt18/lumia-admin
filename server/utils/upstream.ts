import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import type { BffErrorData } from '#shared/types/auth'

/**
 * Cliente HTTP del BFF hacia el Server Fastify.
 *
 * - La URL base es privada (runtimeConfig.apiBaseUrl) y nunca llega al navegador.
 * - Las cookies del navegador NO se reenvían: el BFF construye el header Cookie del Server
 *   a partir de los tokens de la sesión de Lumia Admin (ver admin-session.ts).
 * - Timeout obligatorio, X-Request-ID por llamada y errores normalizados.
 */

export interface UpstreamCredentials {
  accessToken?: string
  refreshToken?: string
}

export interface UpstreamRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Query ya validada por el handler; nunca reenviar el query crudo del navegador. */
  query?: Record<string, string | number | boolean | undefined>
  /** Cuerpo JSON ya validado por el handler. */
  body?: unknown
  /**
   * Cuerpo multipart ya validado y reconstruido por el handler (solo generación de imágenes).
   * Excluyente con `body`. fetch pone el Content-Type con su boundary.
   */
  formData?: FormData
  /** Timeout propio de la llamada (ms); por defecto NUXT_API_TIMEOUT_MS. */
  timeoutMs?: number
  credentials?: UpstreamCredentials
  idempotencyKey?: string
}

export interface UpstreamResponse {
  status: number
  data: unknown
  setCookies: string[]
  requestId: string
}

export class UpstreamError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}

function baseUrl(): string {
  const config = useRuntimeConfig()
  const base = String(config.apiBaseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) {
    throw new UpstreamError(503, 'UPSTREAM_UNAVAILABLE', 'El servidor de Lumia no está configurado (NUXT_API_BASE_URL).')
  }
  return base
}

function buildUrl(path: string, query?: UpstreamRequest['query']): string {
  if (!path.startsWith('/api/')) {
    // Defensa: el BFF solo habla con la API pública del Server bajo /api.
    throw new UpstreamError(500, 'INVALID_UPSTREAM_PATH', 'Ruta interna inválida.')
  }
  const url = new URL(`${baseUrl()}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function buildHeaders(event: H3Event, req: UpstreamRequest, requestId: string): Record<string, string> {
  const config = useRuntimeConfig()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-ID': requestId,
  }

  const cookies: string[] = []
  if (req.credentials?.accessToken) {
    cookies.push(`${config.serverAccessCookieName}=${req.credentials.accessToken}`)
  }
  if (req.credentials?.refreshToken) {
    cookies.push(`${config.serverRefreshCookieName}=${req.credentials.refreshToken}`)
  }
  if (cookies.length) headers.Cookie = cookies.join('; ')

  if (req.body !== undefined && !req.formData) headers['Content-Type'] = 'application/json'
  if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey

  // El Server registra IP y agente en sesiones y auditoría (trustProxy: true).
  // Solo se usa la IP del socket: no se confía en X-Forwarded-For enviado por el navegador.
  const ip = getRequestIP(event)
  if (ip) headers['X-Forwarded-For'] = ip
  const userAgent = getHeader(event, 'user-agent')
  if (userAgent) headers['User-Agent'] = userAgent.slice(0, 512)
  const language = getHeader(event, 'accept-language')
  if (language) headers['Accept-Language'] = language.slice(0, 128)

  return headers
}

function readServerError(data: unknown): { message?: string; code?: string; details?: unknown; requestId?: string } {
  if (!data || typeof data !== 'object') return {}
  const record = data as Record<string, unknown>
  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    details: record.details,
    requestId: typeof record.requestId === 'string' ? record.requestId : undefined,
  }
}

/** Ejecuta la llamada y devuelve la respuesta cruda (sin lanzar por status). */
export async function rawServerCall(event: H3Event, path: string, req: UpstreamRequest = {}): Promise<UpstreamResponse> {
  const config = useRuntimeConfig()
  const requestId = randomUUID()
  const url = buildUrl(path, req.query)
  const timeoutMs =
    req.timeoutMs && req.timeoutMs > 0 ? req.timeoutMs : Number(config.apiTimeoutMs) > 0 ? Number(config.apiTimeoutMs) : 15000
  if (req.formData && req.body !== undefined) {
    throw new UpstreamError(500, 'INVALID_UPSTREAM_BODY', 'Cuerpo de la llamada interna inválido.', requestId)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: req.method ?? 'GET',
      headers: buildHeaders(event, req, requestId),
      body: req.formData ?? (req.body !== undefined ? JSON.stringify(req.body) : undefined),
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error: unknown) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    throw new UpstreamError(
      timedOut ? 504 : 503,
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      timedOut
        ? 'El servidor de Lumia tardó demasiado en responder.'
        : 'No se pudo contactar el servidor de Lumia.',
      requestId,
    )
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inesperada del servidor de Lumia.', requestId)
    }
    try {
      data = JSON.parse(text)
    } catch {
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inválida del servidor de Lumia.', requestId)
    }
  }

  return {
    status: response.status,
    data,
    setCookies: response.headers.getSetCookie(),
    requestId,
  }
}

/**
 * Llamada en streaming (SSE) al Server. Devuelve la respuesta sin leer su cuerpo: el BFF lo
 * reenvía al navegador. El límite de tiempo cubre solo la espera de cabeceras; la duración del
 * stream la limita el Server.
 */
export async function rawServerStream(event: H3Event, path: string, req: UpstreamRequest = {}): Promise<Response> {
  const config = useRuntimeConfig()
  const requestId = randomUUID()
  const url = buildUrl(path, req.query)
  const timeoutMs = Number(config.apiTimeoutMs) > 0 ? Number(config.apiTimeoutMs) : 15000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(url, {
      method: req.method ?? 'POST',
      headers: { ...buildHeaders(event, req, requestId), Accept: 'text/event-stream' },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      redirect: 'manual',
      signal: controller.signal,
    })
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    throw new UpstreamError(
      timedOut ? 504 : 503,
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      timedOut ? 'El servidor de Lumia tardó demasiado en responder.' : 'No se pudo contactar el servidor de Lumia.',
      requestId,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    assertOk({ status: response.status, data, setCookies: [], requestId })
    throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inesperada del servidor de Lumia.', requestId)
  }
  if (!(response.headers.get('content-type') ?? '').includes('text/event-stream') || !response.body) {
    await response.body?.cancel().catch(() => undefined)
    throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inesperada del servidor de Lumia.', requestId)
  }
  return response
}

/** Convierte una respuesta no exitosa del Server en UpstreamError. */
export function assertOk(res: UpstreamResponse): UpstreamResponse {
  if (res.status >= 200 && res.status < 300) return res
  const info = readServerError(res.data)
  const requestId = info.requestId ?? res.requestId

  if (res.status >= 500) {
    // No se reenvían detalles internos de errores 5xx.
    throw new UpstreamError(502, info.code ?? 'UPSTREAM_ERROR', 'El servidor de Lumia no pudo completar la operación.', requestId)
  }
  if (res.status >= 300 && res.status < 400) {
    throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inesperada del servidor de Lumia.', requestId)
  }
  throw new UpstreamError(res.status, info.code ?? `HTTP_${res.status}`, info.message ?? 'Solicitud rechazada.', requestId, info.details)
}

/** Lanza un error h3 con el formato BffErrorData que entiende el cliente. */
export function throwBffError(statusCode: number, data: BffErrorData): never {
  throw createError({ statusCode, statusMessage: data.code, message: data.message, data })
}

/** Normaliza cualquier error de un handler a la respuesta BFF. */
export function toBffError(error: unknown): never {
  if (error instanceof UpstreamError) {
    const fieldErrors = extractFieldErrors(error.details)
    throwBffError(error.statusCode, {
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      ...(fieldErrors ? { fieldErrors } : {}),
    })
  }
  if (isError(error)) throw error
  console.error('[bff] error no controlado', error)
  throwBffError(500, { code: 'INTERNAL_ERROR', message: 'Error interno de Lumia Admin.' })
}

/** El Server devuelve zod flatten() en `details` para "Invalid input". */
function extractFieldErrors(details: unknown): Record<string, string[]> | undefined {
  if (!details || typeof details !== 'object') return undefined
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors
  if (!fieldErrors || typeof fieldErrors !== 'object') return undefined
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (Array.isArray(value)) out[key] = value.filter((v): v is string => typeof v === 'string')
  }
  return Object.keys(out).length ? out : undefined
}
