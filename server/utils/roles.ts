import type { H3Event } from 'h3'
import { PERMISSION_WILDCARD } from '#shared/auth/permissions'
import {
  serverEffectiveRoleSchema,
  serverRoleEnvelopeSchema,
  serverRoleExportSchema,
  serverRoleListSchema,
  toRoleSummary,
  type RoleDetail,
  type RoleRow,
  type ServerRole,
} from '#shared/schemas/roles'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'
import { loadAdminSession } from './session-profile'
import { throwBffError } from './upstream'

/**
 * Catálogo completo de roles: activos (con número de usuarios asignados) desde `/roles` y
 * archivados desde `/roles/export`, que es el único endpoint que los devuelve.
 */
export async function loadRoleCatalog(event: H3Event) {
  const [list, exported] = await Promise.all([
    serverApi(event, '/api/admin/security/roles', { query: { page: 1, limit: 100 } }),
    serverApi(event, '/api/admin/security/roles/export'),
  ])
  const active = parseUpstream(serverRoleListSchema, list, 'GET /admin/security/roles')
  const all = parseUpstream(serverRoleExportSchema, exported, 'GET /admin/security/roles/export').items
  const counts = new Map(active.items.map((r) => [r.id, r.assignedUserCount]))
  return { all, counts, truncated: active.pagination.hasNext }
}

type RoleCatalog = Awaited<ReturnType<typeof loadRoleCatalog>>

export function toRoleRow(role: ServerRole, catalog: RoleCatalog): RoleRow {
  return {
    ...toRoleSummary(role),
    permissionCount: role.permissionKeys.length,
    assignedUserCount: role.isArchived ? null : (catalog.counts.get(role.id) ?? null),
    inheritedByCount: catalog.all.filter((r) => r.inheritRoleIds.includes(role.id)).length,
    updatedAt: role.updatedAt ?? null,
  }
}

export async function fetchRole(event: H3Event, id: string): Promise<ServerRole> {
  return parseUpstream(
    serverRoleEnvelopeSchema,
    await serverApi(event, `/api/admin/security/roles/${id}`),
    'GET /admin/security/roles/:id',
  ).role
}

export async function fetchEffectiveAllow(event: H3Event, id: string): Promise<string[]> {
  const data = parseUpstream(
    serverEffectiveRoleSchema,
    await serverApi(event, `/api/admin/security/roles/effective/${id}`),
    'GET /admin/security/roles/effective/:id',
  )
  return [...new Set(data.allow)].sort()
}

export async function loadRoleDetail(event: H3Event, id: string): Promise<RoleDetail> {
  const [role, catalog, effectiveAllow] = await Promise.all([
    fetchRole(event, id),
    loadRoleCatalog(event),
    fetchEffectiveAllow(event, id),
  ])
  const byId = new Map(catalog.all.map((r) => [r.id, r]))
  return {
    ...toRoleRow(role, catalog),
    version: role.version,
    permissionKeys: [...role.permissionKeys].sort(),
    denyKeys: [...role.denyKeys].sort(),
    inheritsFrom: role.inheritRoleIds.flatMap((rid) => {
      const parent = byId.get(rid)
      return parent ? [toRoleSummary(parent)] : []
    }),
    inheritedBy: catalog.all.filter((r) => r.inheritRoleIds.includes(role.id)).map(toRoleSummary),
    effectiveAllow,
  }
}

/** Permisos de `granted` que no estaban en `already` y que quien actúa no tiene. */
export function findEscalation(actor: readonly string[], granted: readonly string[], already: readonly string[] = []): string[] {
  if (actor.includes(PERMISSION_WILDCARD)) return []
  const own = new Set(actor)
  const before = new Set(already)
  return [...new Set(granted)].filter((k) => !own.has(k) && !before.has(k)).sort()
}

/**
 * Regla general de Lumia Admin: nadie concede permisos que no tiene. El Server no la aplica
 * (docs/modules.md, puntos 32 y 37).
 */
export async function assertNoEscalation(event: H3Event, granted: readonly string[], already: readonly string[] = []) {
  const actor = await loadAdminSession(event)
  const escalated = findEscalation(actor.permissions, granted, already)
  if (escalated.length) {
    throwBffError(403, {
      code: 'PRIVILEGE_ESCALATION',
      message: `Incluye permisos que tú no tienes: ${escalated.slice(0, 8).join(', ')}${escalated.length > 8 ? '…' : ''}.`,
    })
  }
}

/**
 * Archivar o eliminar un rol hace que el Server lo ignore. A quien solo tuviera ese rol le aplicaría
 * el rol base (`admin` = todos los permisos), y los roles que heredan de él perderían permisos.
 * Por eso solo se permite sin usuarios asignados y sin roles que hereden de él.
 */
export function assertRoleDetachable(role: RoleRow, action: 'archive' | 'delete') {
  if (role.isSystem) {
    throwBffError(409, { code: 'SYSTEM_ROLE', message: 'Los roles de sistema no se pueden archivar ni eliminar.' })
  }
  if (role.isArchived) {
    throwBffError(409, {
      code: 'ROLE_ARCHIVED',
      message:
        action === 'delete'
          ? 'Un rol archivado no se puede eliminar desde aquí: el servidor no informa cuántos usuarios lo conservan.'
          : 'El rol ya está archivado.',
    })
  }
  if (role.assignedUserCount === null) {
    throwBffError(409, {
      code: 'ROLE_USAGE_UNKNOWN',
      message: 'No se pudo comprobar cuántos usuarios tienen este rol (hay más de 100 roles activos).',
    })
  }
  if (role.assignedUserCount > 0) {
    throwBffError(409, {
      code: 'ROLE_IN_USE',
      message: `Tiene ${role.assignedUserCount} usuario(s) asignado(s). Quítaselo primero desde Usuarios.`,
    })
  }
  if (role.inheritedByCount > 0) {
    throwBffError(409, {
      code: 'ROLE_INHERITED',
      message: `${role.inheritedByCount} rol(es) heredan sus permisos.`,
    })
  }
}
