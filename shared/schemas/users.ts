import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, OBJECT_ID_PATTERN, paginationSchema } from './common'
import { serverRoleSchema, type RoleSummary } from './roles'

export { serverEffectiveRoleSchema, serverRoleEnvelopeSchema, serverRoleListSchema, toRoleSummary } from './roles'
export type { RoleSummary, ServerRole } from './roles'

/**
 * Usuarios y asignación de roles. Fuente en el Server:
 * - Rutas: server/src/routes/security.routes.ts (`/admin/security/users*`, admin.users.read/manage)
 *   y `/admin/security/roles*` (admin.roles.read).
 * - Salida: SecurityAdminService.listUsers/getUser (permisos efectivos reales: roles RBAC con
 *   herencia y denegaciones, o el rol base `role` si no tiene asignaciones, más permisos temporales).
 *
 * No se usan `/admin/users/:id` ni `/admin/staff-users*`: calculan los permisos solo con el rol base
 * (ignoran los roles RBAC) y `/admin/staff-users/:id/roles` cambia el rol base, otro sistema.
 */

export const LEGACY_ROLES = ['admin', 'moderator', 'user'] as const
export type LegacyRole = (typeof LEGACY_ROLES)[number]

export const LEGACY_ROLE_LABELS: Record<LegacyRole, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  user: 'Cliente',
}

const legacyRole = z.enum(LEGACY_ROLES).catch('user')

export const serverUserListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable().optional(),
      role: legacyRole,
      isStaff: z.boolean().optional().default(false),
      twoFactorEnabled: z.boolean().optional().default(false),
      assignedRoles: z.array(serverRoleSchema).optional().default([]),
      effectivePermissionCount: z.number().int().min(0).optional().default(0),
      createdAt: isoDate,
    }),
  ),
  pagination: paginationSchema,
})

export const serverUserDetailSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable().optional(),
    role: legacyRole,
    isStaff: z.boolean().optional().default(false),
    twoFactorEnabled: z.boolean().optional().default(false),
    createdAt: isoDate,
  }),
  roles: z.array(serverRoleSchema),
  effectivePermissionKeys: z.array(z.string()),
})
export type ServerUserDetail = z.infer<typeof serverUserDetailSchema>

export interface UserRow {
  id: string
  email: string
  name: string | null
  legacyRole: LegacyRole
  isStaff: boolean
  twoFactorEnabled: boolean
  roles: RoleSummary[]
  effectivePermissionCount: number
  createdAt: string | null
}

export interface UserList {
  items: UserRow[]
  pagination: AdminPaginationMeta
}

export interface UserDetail {
  id: string
  email: string
  name: string | null
  legacyRole: LegacyRole
  isStaff: boolean
  twoFactorEnabled: boolean
  createdAt: string | null
  roles: RoleSummary[]
  /** Permisos efectivos reales, calculados por el Server. */
  effectivePermissions: string[]
  /** true si es la cuenta con la que se inició sesión (no puede cambiar sus propios roles). */
  isSelf: boolean
}

export interface AssignableRoles {
  items: RoleSummary[]
  /** true si el Server tiene más roles de los que se cargaron. */
  truncated: boolean
}

export const roleAssignBodySchema = z
  .object({
    roleId: z
      .string({ required_error: 'Elige un rol.', invalid_type_error: 'Elige un rol.' })
      .regex(OBJECT_ID_PATTERN, 'Elige un rol.'),
  })
  .strict()
export type RoleAssignBody = z.infer<typeof roleAssignBodySchema>
