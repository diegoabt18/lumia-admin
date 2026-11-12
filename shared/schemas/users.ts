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
 *   herencia y denegaciones, más permisos temporales; sin roles asignados, sin permisos).
 *
 * No se usan `/admin/users/:id` ni `/admin/staff-users*`: son el sistema antiguo basado en el rol base.
 */

export const serverUserListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable().optional(),
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
