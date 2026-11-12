import { z } from 'zod'
import { PERMISSIONS, type PermissionId } from '../auth/permissions'
import { isoDate, paginationSchema } from './common'

/**
 * Roles RBAC. Fuente en el Server:
 * - Rutas: server/src/routes/security.routes.ts y security-extended.routes.ts
 *   (`/admin/security/roles*`, admin.roles.read / admin.roles.manage)
 * - Entrada: roleCreateSchema, rolePatchSchema, roleDuplicateSchema (security/schemas).
 *   El esquema acepta `denyKeys` e `inheritRoleIds`, pero SecurityAdminService.createRole/updateRole
 *   los IGNORA: solo se guardan nombre, descripción y permisos. Aquí no se ofrecen.
 * - Salida: toRoleDomain (security/domain/role.entity.ts); el listado añade `assignedUserCount`
 *   y excluye los archivados. Los archivados solo aparecen en `/roles/export`.
 * - Roles de sistema: no se pueden cambiar sus permisos, ni archivar ni eliminar.
 */

export const serverRoleSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  permissionKeys: z.array(z.string()).optional().default([]),
  denyKeys: z.array(z.string()).optional().default([]),
  inheritRoleIds: z.array(z.string()).optional().default([]),
  isSystem: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
  archivedAt: isoDate,
  version: z.number().int().optional().default(1),
  updatedAt: isoDate,
})
export type ServerRole = z.infer<typeof serverRoleSchema>

export const serverRoleListSchema = z.object({
  items: z.array(serverRoleSchema.extend({ assignedUserCount: z.number().int().min(0).optional().default(0) })),
  pagination: paginationSchema,
})

export const serverRoleExportSchema = z.object({ items: z.array(serverRoleSchema) })
export const serverRoleEnvelopeSchema = z.object({ role: serverRoleSchema })
export const serverEffectiveRoleSchema = z.object({
  allow: z.array(z.string()),
  deny: z.array(z.string()),
})

/** Rol tal como lo ve la interfaz. */
export interface RoleSummary {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  isArchived: boolean
}

export function toRoleSummary(role: ServerRole): RoleSummary {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description?.trim() || null,
    isSystem: role.isSystem,
    isArchived: role.isArchived,
  }
}

export interface RoleRow extends RoleSummary {
  permissionCount: number
  /** null en roles archivados: el Server no los cuenta. */
  assignedUserCount: number | null
  /** Roles que heredan de este (activos o archivados). */
  inheritedByCount: number
  updatedAt: string | null
}

export interface RoleList {
  items: RoleRow[]
  /** true si el Server tiene más de 100 roles activos (no se cargaron todos). */
  truncated: boolean
}

export interface RoleDetail extends RoleRow {
  version: number
  permissionKeys: string[]
  denyKeys: string[]
  inheritsFrom: RoleSummary[]
  inheritedBy: RoleSummary[]
  /** Permisos efectivos del rol (propios + heredados − denegados), calculados por el Server. */
  effectiveAllow: string[]
}

// ---------- Entrada ----------

const ALL_PERMISSION_IDS = Object.values(PERMISSIONS) as [PermissionId, ...PermissionId[]]

/** Clave técnica del rol: estable y legible. Más estricta que el Server (2 a 64 caracteres libres). */
export const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/

const roleKey = z
  .string({ required_error: 'Ingresa la clave.' })
  .trim()
  .regex(ROLE_KEY_PATTERN, 'Usa de 2 a 64 caracteres: minúsculas, números, guion o guion bajo, empezando por una letra.')

const roleName = z
  .string({ required_error: 'Ingresa el nombre.' })
  .trim()
  .min(2, 'Mínimo 2 caracteres.')
  .max(120, 'Máximo 120 caracteres.')

const roleDescription = z.string().trim().max(500, 'Máximo 500 caracteres.')

/** Solo permisos conocidos (sin comodín `*`), sin duplicados. */
const permissionKeys = z
  .array(z.enum(ALL_PERMISSION_IDS, { errorMap: () => ({ message: 'Permiso desconocido.' }) }))
  .max(ALL_PERMISSION_IDS.length)
  .transform((keys) => [...new Set(keys)].sort())

export const roleCreateBodySchema = z
  .object({ key: roleKey, name: roleName, description: roleDescription.optional().default(''), permissionKeys })
  .strict()
export type RoleCreateBody = z.infer<typeof roleCreateBodySchema>

/** `version`: la que se leyó al abrir el rol; el BFF rechaza el cambio si otro lo modificó entretanto. */
export const rolePatchBodySchema = z
  .object({
    version: z.number({ required_error: 'Falta la versión del rol.' }).int().min(1),
    name: roleName.optional(),
    description: roleDescription.optional(),
    permissionKeys: permissionKeys.optional(),
  })
  .strict()
  .refine((o) => o.name !== undefined || o.description !== undefined || o.permissionKeys !== undefined, {
    message: 'No hay cambios para guardar.',
  })
export type RolePatchBody = z.infer<typeof rolePatchBodySchema>

/** Formulario de alta y duplicado (los permisos se configuran después, en el detalle). */
export const roleIdentitySchema = z.object({ key: roleKey, name: roleName, description: roleDescription.optional() })
export type RoleIdentity = z.infer<typeof roleIdentitySchema>

export const roleDuplicateBodySchema = z.object({ key: roleKey, name: roleName }).strict()
export type RoleDuplicateBody = z.infer<typeof roleDuplicateBodySchema>

// ---------- Presentación de permisos ----------

/** Etiquetas de los módulos (prefijo del permiso). Solo texto de interfaz. */
export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  admin: 'Administración',
  orders: 'Pedidos',
  payments: 'Pagos',
  products: 'Productos',
  categories: 'Categorías',
  analytics: 'Analítica',
  materials: 'Materiales',
  suppliers: 'Proveedores',
  recipes: 'Recetas',
  costing: 'Costeo',
  production: 'Configuración de producción',
  units: 'Unidades',
  equivalences: 'Equivalencias',
  account: 'Cuenta (tienda)',
  page: 'Páginas (tienda)',
  cart: 'Carrito (tienda)',
}

export interface PermissionGroup {
  key: string
  label: string
  permissions: PermissionId[]
}

/** Permisos conocidos agrupados por módulo, en el orden de PERMISSION_GROUP_LABELS. */
export function groupPermissions(): PermissionGroup[] {
  const groups = new Map<string, PermissionId[]>()
  for (const id of ALL_PERMISSION_IDS) {
    const prefix = id.split('.')[0] ?? id
    groups.set(prefix, [...(groups.get(prefix) ?? []), id])
  }
  const order = Object.keys(PERMISSION_GROUP_LABELS)
  return [...groups.entries()]
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map(([key, permissions]) => ({ key, label: PERMISSION_GROUP_LABELS[key] ?? key, permissions }))
}
