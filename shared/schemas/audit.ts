import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, paginationSchema } from './common'

/**
 * Auditoría. Fuente en el Server (ambas con admin.audit.read):
 * - Accesos: GET /admin/audit-log → AdminAuditService.list → AuthAuditRepository (auth_audit_log).
 *   Solo registra LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_2FA_FAILED y LOGOUT.
 *   Con `search`, el Server IGNORA el filtro `event`.
 * - Cambios de permisos: GET /admin/security/permission-audit → PermissionAuditRepository
 *   (permission_audit). Hoy solo lo escriben los permisos temporales y la importación de roles:
 *   asignar roles, editar roles, pedidos, productos o configuración NO quedan registrados.
 */

export const AUTH_AUDIT_EVENTS = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_2FA_FAILED', 'LOGOUT'] as const
export type AuthAuditEvent = (typeof AUTH_AUDIT_EVENTS)[number]

export const AUTH_AUDIT_EVENT_LABELS: Record<AuthAuditEvent | 'unknown', string> = {
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILED: 'Intento fallido',
  LOGIN_2FA_FAILED: 'Código 2FA fallido',
  LOGOUT: 'Cierre de sesión',
  unknown: 'Otro',
}

/** Fecha de calendario (YYYY-MM-DD) en la zona horaria de la tienda. */
export const CALENDAR_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

const optionalText = z.string().nullable().optional()

export const serverAuthAuditListSchema = z.object({
  items: z.array(
    z.object({
      _id: z.string().optional(),
      event: z.string(),
      userId: optionalText,
      email: optionalText,
      ip: optionalText,
      userAgent: optionalText,
      metadata: z.record(z.unknown()).nullable().optional(),
      timestamp: isoDate,
    }),
  ),
  pagination: paginationSchema,
})

export interface AuthAuditRow {
  id: string
  event: AuthAuditEvent | 'unknown'
  userId: string | null
  email: string | null
  ip: string | null
  userAgent: string | null
  via2fa: boolean
  reuseDetected: boolean
  at: string | null
}

export interface AuthAuditList {
  items: AuthAuditRow[]
  pagination: AdminPaginationMeta
}

export const PERMISSION_AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  archive: 'Archivar',
  restore: 'Restaurar',
  grant: 'Conceder',
  revoke: 'Revocar',
  approve: 'Aprobar',
  reject: 'Rechazar',
}

export const PERMISSION_AUDIT_ENTITY_LABELS: Record<string, string> = {
  role: 'Rol',
  permission: 'Permiso',
  user: 'Usuario',
  temporal: 'Permiso temporal',
  override: 'Excepción',
  delegation: 'Delegación',
  template: 'Plantilla',
  conditional: 'Condicional',
  approval: 'Aprobación',
  webhook: 'Webhook',
}

export const serverPermissionAuditListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      entityType: z.string(),
      entityId: z.string().optional().default(''),
      entityLabel: z.string().optional().default(''),
      action: z.string(),
      changedBy: z.string().optional().default(''),
      changedByEmail: optionalText,
      summary: z.string().optional().default(''),
      ip: optionalText,
      timestamp: isoDate,
    }),
  ),
  pagination: paginationSchema,
})

export interface PermissionAuditRow {
  id: string
  entityType: string
  entityLabel: string
  action: string
  changedBy: string
  changedByEmail: string | null
  summary: string
  ip: string | null
  at: string | null
}

export interface PermissionAuditList {
  items: PermissionAuditRow[]
  pagination: AdminPaginationMeta
}
