import { revokeCurrentSession } from '../../utils/session-profile'

/**
 * Cierra únicamente la sesión de Lumia Admin de este navegador.
 * No usa /api/auth/logout-all: eso cerraría también las sesiones del usuario en Lumia 2.0.
 */
export default defineEventHandler(async (event) => {
  await revokeCurrentSession(event)
  return { ok: true as const }
})
