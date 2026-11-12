/**
 * Tipos de sesión expuestos por el BFF de Lumia Admin al navegador.
 *
 * El Server no publica un contrato de auth en server/shared/contracts; estos tipos son una
 * proyección reducida de UserDomain (server/src/modules/identity/domain/user.entity.ts).
 * El BFF valida la respuesta real con Zod y descarta todo campo que la interfaz no necesita
 * (direcciones, preferencias, etc.).
 */

export interface AdminUser {
  id: string
  email: string
  displayName: string
  avatar: string | null
  provider: 'local' | 'google' | null
}

export interface AdminSession {
  user: AdminUser
  /** Permisos efectivos resueltos por el Server (puede incluir el comodín "*"). */
  permissions: string[]
}

export type LoginResult =
  | { status: 'authenticated'; session: AdminSession }
  | { status: 'two_factor_required' }

/** Códigos de error que el BFF devuelve en `data.code`. */
export type BffErrorCode =
  | 'SESSION_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'NO_ADMIN_ACCESS'
  | 'TWO_FACTOR_EXPIRED'
  | 'INVALID_INPUT'
  | 'FORBIDDEN_ORIGIN'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_INVALID_RESPONSE'
  | (string & {})

export interface BffErrorData {
  code: BffErrorCode
  message: string
  /** Errores por campo cuando la validación falla (zod flatten().fieldErrors). */
  fieldErrors?: Record<string, string[]>
  requestId?: string
}
