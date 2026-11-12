import { rawServerCall } from '../utils/upstream'

/**
 * Salud del BFF y alcance del Server (GET /health/live no está bajo /api, así que se usa
 * GET /api/auth/me sin credenciales: 401 confirma que el Server responde).
 * Responde 200 aunque el Server no esté disponible; `upstream` lo indica.
 */
export default defineEventHandler(async (event) => {
  let upstream: 'reachable' | 'unreachable' | 'not_configured' = 'unreachable'
  try {
    const res = await rawServerCall(event, '/api/auth/me')
    upstream = res.status === 401 || res.status === 200 ? 'reachable' : 'unreachable'
  } catch (error) {
    const code = (error as { code?: string }).code
    upstream = code === 'UPSTREAM_UNAVAILABLE' && !useRuntimeConfig().apiBaseUrl ? 'not_configured' : 'unreachable'
  }
  return { status: 'ok' as const, upstream }
})
