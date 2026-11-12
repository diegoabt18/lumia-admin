import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  clearAdminSession,
  readServerTokens,
  readSessionTokens,
  storeServerTokens,
  type ServerTokens,
} from './admin-session'
import {
  assertOk,
  rawServerCall,
  rawServerStream,
  throwBffError,
  UpstreamError,
  type UpstreamRequest,
} from './upstream'

/**
 * Llamadas autenticadas al Server con renovación transparente de la sesión.
 *
 * El Server rota el refresh token en cada POST /api/auth/refresh: el token anterior deja de
 * existir y reutilizarlo devuelve 401. Si dos peticiones del mismo navegador renuevan a la vez,
 * la segunda cerraría la sesión. Para evitarlo, las renovaciones se deduplican por hash del
 * refresh token y su resultado se conserva unos segundos para las peticiones rezagadas que aún
 * traen el token anterior.
 *
 * El mapa vive en memoria del proceso Nitro, indexado por un hash del token (no por usuario):
 * solo quien posee el token puede alcanzar su entrada. Válido para una sola instancia (despliegue
 * local en Docker). Con varias réplicas haría falta afinidad de sesión o un almacén compartido.
 */

type RefreshOutcome = { ok: true; tokens: ServerTokens } | { ok: false }

const REFRESH_RESULT_TTL_MS = 15_000
const refreshes = new Map<string, { promise: Promise<RefreshOutcome>; expiresAt: number }>()

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function pruneRefreshes(now: number) {
  for (const [key, entry] of refreshes) {
    if (entry.expiresAt <= now) refreshes.delete(key)
  }
}

async function performRefresh(event: H3Event, refreshToken: string): Promise<RefreshOutcome> {
  const res = await rawServerCall(event, '/api/auth/refresh', {
    method: 'POST',
    credentials: { refreshToken },
  })
  if (res.status !== 200) {
    if (res.status >= 500) assertOk(res)
    return { ok: false }
  }
  const tokens = readServerTokens(res.setCookies)
  if (!tokens.access?.value || !tokens.refresh?.value) return { ok: false }
  return { ok: true, tokens }
}

/** Renueva la sesión (deduplicado). Devuelve true si hay tokens nuevos en la petición. */
export async function refreshAdminSession(event: H3Event): Promise<boolean> {
  const { refreshToken } = readSessionTokens(event)
  if (!refreshToken) return false

  const now = Date.now()
  pruneRefreshes(now)
  const key = hashToken(refreshToken)
  let entry = refreshes.get(key)
  if (!entry) {
    const promise = performRefresh(event, refreshToken)
    entry = { promise, expiresAt: Number.POSITIVE_INFINITY }
    refreshes.set(key, entry)
    promise
      .then(
        () => {
          entry!.expiresAt = Date.now() + REFRESH_RESULT_TTL_MS
        },
        () => {
          refreshes.delete(key)
        },
      )
  }

  const outcome = await entry.promise
  if (!outcome.ok) return false
  storeServerTokens(event, outcome.tokens)
  return true
}

function sessionError(code: 'SESSION_REQUIRED' | 'SESSION_EXPIRED'): never {
  throwBffError(401, {
    code,
    message: code === 'SESSION_REQUIRED' ? 'Inicia sesión para continuar.' : 'Tu sesión expiró. Inicia sesión de nuevo.',
  })
}

/**
 * Garantiza un access token vigente para la petición (renovando si hace falta).
 * Lanza 401 si no hay sesión recuperable.
 */
export async function ensureAdminAccess(event: H3Event): Promise<void> {
  const { accessToken, refreshToken } = readSessionTokens(event)
  if (accessToken) return
  if (!refreshToken) sessionError('SESSION_REQUIRED')
  if (!(await refreshAdminSession(event))) {
    clearAdminSession(event)
    sessionError('SESSION_EXPIRED')
  }
}

/**
 * Llama a un endpoint protegido del Server con la sesión del admin.
 * Ante un 401 (token caducado o autorización obsoleta) renueva una vez y reintenta:
 * un 401 del Server ocurre en el preHandler de autenticación, antes de ejecutar el handler,
 * por lo que el reintento no duplica efectos.
 */
export async function serverApi<T = unknown>(event: H3Event, path: string, req: Omit<UpstreamRequest, 'credentials'> = {}): Promise<T> {
  await ensureAdminAccess(event)

  const first = await rawServerCall(event, path, { ...req, credentials: { accessToken: readSessionTokens(event).accessToken } })
  if (first.status !== 401) return assertOk(first).data as T

  if (!(await refreshAdminSession(event))) {
    clearAdminSession(event)
    sessionError('SESSION_EXPIRED')
  }

  const second = await rawServerCall(event, path, { ...req, credentials: { accessToken: readSessionTokens(event).accessToken } })
  if (second.status === 401) {
    clearAdminSession(event)
    sessionError('SESSION_EXPIRED')
  }
  return assertOk(second).data as T
}

/**
 * Llamada en streaming al Server con la sesión del admin. Misma renovación que serverApi:
 * ante un 401 se renueva la sesión una vez y se reintenta antes de empezar a leer el stream.
 */
export async function serverStream(
  event: H3Event,
  path: string,
  req: Omit<UpstreamRequest, 'credentials'> = {},
): Promise<Response> {
  await ensureAdminAccess(event)

  try {
    return await rawServerStream(event, path, { ...req, credentials: { accessToken: readSessionTokens(event).accessToken } })
  } catch (error) {
    if (!(error instanceof UpstreamError) || error.statusCode !== 401) throw error
  }

  if (!(await refreshAdminSession(event))) {
    clearAdminSession(event)
    sessionError('SESSION_EXPIRED')
  }

  try {
    return await rawServerStream(event, path, { ...req, credentials: { accessToken: readSessionTokens(event).accessToken } })
  } catch (error) {
    if (error instanceof UpstreamError && error.statusCode === 401) {
      clearAdminSession(event)
      sessionError('SESSION_EXPIRED')
    }
    throw error
  }
}
