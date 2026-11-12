import type { H3Event } from 'h3'
import { z } from 'zod'
import { hasPermission, PERMISSIONS, sanitizePermissions } from '#shared/auth/permissions'
import type { AdminSession, AdminUser } from '#shared/types/auth'
import { clearAdminSession, readSessionTokens } from './admin-session'
import { rawServerCall, throwBffError, UpstreamError } from './upstream'
import { serverApi } from './server-api'

/**
 * Validación de las respuestas de identidad del Server y proyección al modelo del admin.
 * Fuentes: GET /api/auth/me (UserDomain) y GET /api/auth/permissions.
 */

const serverUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  name: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  provider: z.enum(['local', 'google']).optional().nullable().catch(null),
})

const meResponseSchema = z.object({ user: serverUserSchema })
const permissionsResponseSchema = z.object({ permissions: z.array(z.unknown()) })

function toAdminUser(user: z.infer<typeof serverUserSchema>): AdminUser {
  const displayName = user.name?.trim() || user.nickname?.trim() || user.email.split('@')[0] || 'Usuario'
  return {
    id: user.id,
    email: user.email,
    displayName,
    avatar: user.avatar && /^https:\/\//.test(user.avatar) ? user.avatar : null,
    provider: user.provider ?? null,
  }
}

function invalidUpstream(): never {
  throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'Respuesta inesperada del servidor de Lumia.')
}

/** Usuario actual + permisos efectivos. Exige admin.access (igual que adminGuard del Server). */
export async function loadAdminSession(event: H3Event): Promise<AdminSession> {
  const me = meResponseSchema.safeParse(await serverApi(event, '/api/auth/me'))
  if (!me.success) invalidUpstream()

  const perms = permissionsResponseSchema.safeParse(await serverApi(event, '/api/auth/permissions'))
  if (!perms.success) invalidUpstream()

  const permissions = sanitizePermissions(perms.data.permissions)
  if (!hasPermission(permissions, PERMISSIONS.ADMIN_ACCESS)) {
    await revokeCurrentSession(event)
    throwBffError(403, {
      code: 'NO_ADMIN_ACCESS',
      message: 'Tu cuenta no tiene acceso al panel administrativo.',
    })
  }

  return { user: toAdminUser(me.data.user), permissions }
}

/**
 * Cierra en el Server la sesión de ESTE navegador en Lumia Admin (POST /api/auth/logout con su
 * refresh token) y borra las cookies propias. No afecta otras sesiones del usuario (p. ej. Lumia 2.0).
 */
export async function revokeCurrentSession(event: H3Event): Promise<void> {
  const { refreshToken } = readSessionTokens(event)
  try {
    if (refreshToken) {
      await rawServerCall(event, '/api/auth/logout', { method: 'POST', credentials: { refreshToken } })
    }
  } catch (error) {
    // El cierre local procede aunque el Server no responda; el refresh token caduca solo.
    console.warn('[bff] no se pudo revocar la sesión en el Server', error instanceof Error ? error.message : error)
  } finally {
    clearAdminSession(event)
  }
}
