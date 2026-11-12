import type { H3Event } from 'h3'
import { PERMISSION_WILDCARD } from '#shared/auth/permissions'
import {
  serverEffectiveRoleSchema,
  serverRoleEnvelopeSchema,
  serverUserDetailSchema,
  toRoleSummary,
  type ServerUserDetail,
  type UserDetail,
} from '#shared/schemas/users'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'
import { loadAdminSession } from './session-profile'
import { throwBffError } from './upstream'

export async function fetchUserDetail(event: H3Event, id: string): Promise<ServerUserDetail> {
  return parseUpstream(
    serverUserDetailSchema,
    await serverApi(event, `/api/admin/security/users/${id}`),
    'GET /admin/security/users/:id',
  )
}

export function toUserDetail(data: ServerUserDetail, actorId: string): UserDetail {
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name?.trim() || null,
    isStaff: data.user.isStaff,
    twoFactorEnabled: data.user.twoFactorEnabled,
    createdAt: data.user.createdAt ?? null,
    roles: data.roles.map(toRoleSummary),
    effectivePermissions: [...new Set(data.effectivePermissionKeys)].sort(),
    isSelf: data.user.id === actorId,
  }
}

async function fetchEffectiveRole(event: H3Event, roleId: string) {
  return parseUpstream(
    serverEffectiveRoleSchema,
    await serverApi(event, `/api/admin/security/roles/effective/${roleId}`),
    'GET /admin/security/roles/effective/:id',
  )
}

/**
 * Protecciones que el Server no aplica al asignar o quitar roles (ver docs/modules.md, puntos 31 a 35):
 *
 * 1. Nadie cambia sus propios roles (evita autoescalada y quedarse sin acceso).
 * 2. No se asignan roles archivados (el Server los ignora al calcular permisos).
 * 3. Sin escalada: los permisos que el usuario GANARÍA con el cambio deben estar todos entre los
 *    permisos de quien lo hace. Se simula el cálculo del Server (AuthorizationService
 *    .resolveRoleBasedPermissions): unión de `allow` de los roles activos menos la unión de `deny`.
 *    Quitar un rol con denegaciones también puede conceder permisos, así que se comprueba igual.
 * 4. Si el cambio deja al usuario sin roles activos, no tendrá permisos (no hay respaldo por rol base).
 *
 * Exige admin.roles.read además de admin.users.manage, porque necesita leer los roles.
 * Comprobación previa (no atómica): el Server sigue siendo quien aplica el cambio.
 */
export async function assertRoleChangeAllowed(
  event: H3Event,
  userId: string,
  change: { add: string } | { remove: string },
): Promise<void> {
  const actor = await loadAdminSession(event)
  if (actor.user.id === userId) {
    throwBffError(403, { code: 'SELF_ROLE_CHANGE', message: 'No puedes cambiar tus propios roles.' })
  }

  const target = await fetchUserDetail(event, userId)
  const current = new Map(target.roles.map((r) => [r.id, r]))

  if ('add' in change) {
    if (current.has(change.add)) {
      throwBffError(409, { code: 'ROLE_ALREADY_ASSIGNED', message: 'El usuario ya tiene ese rol.' })
    }
    const { role } = parseUpstream(
      serverRoleEnvelopeSchema,
      await serverApi(event, `/api/admin/security/roles/${change.add}`),
      'GET /admin/security/roles/:id',
    )
    if (role.isArchived) {
      throwBffError(409, { code: 'ROLE_ARCHIVED', message: 'El rol está archivado y no se puede asignar.' })
    }
    current.set(role.id, role)
  } else {
    if (!current.has(change.remove)) {
      throwBffError(404, { code: 'ROLE_NOT_ASSIGNED', message: 'El usuario no tiene ese rol.' })
    }
    current.delete(change.remove)
  }

  const active = [...current.values()].filter((r) => !r.isArchived)
  const effective = await Promise.all(active.map((r) => fetchEffectiveRole(event, r.id)))
  const verdict = evaluateRoleChange({
    actorPermissions: actor.permissions,
    targetPermissions: target.effectivePermissionKeys,
    resultingRoles: effective,
  })
  if (verdict.ok) return
  const keys = verdict.escalated
  throwBffError(403, {
    code: 'PRIVILEGE_ESCALATION',
    message: `El cambio daría permisos que tú no tienes: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}.`,
  })
}

export type RoleChangeVerdict =
  | { ok: true }
  | { ok: false; reason: 'escalation'; escalated: string[] }

/**
 * Decisión pura de assertRoleChangeAllowed (puntos 3 y 4), separada para poder probarla.
 * `resultingRoles`: allow/deny efectivos de cada rol activo que tendría el usuario tras el cambio.
 */
export function evaluateRoleChange(input: {
  actorPermissions: readonly string[]
  targetPermissions: readonly string[]
  resultingRoles: ReadonlyArray<{ allow: readonly string[]; deny: readonly string[] }>
}): RoleChangeVerdict {
  const allow = new Set(input.resultingRoles.flatMap((r) => r.allow))
  for (const key of input.resultingRoles.flatMap((r) => r.deny)) allow.delete(key)

  // Sin permisos efectivos no hay nada que escalar: el usuario simplemente no tiene acceso.
  if (allow.size === 0) return { ok: true }
  if (input.actorPermissions.includes(PERMISSION_WILDCARD)) return { ok: true }

  const before = new Set(input.targetPermissions)
  const actor = new Set(input.actorPermissions)
  const escalated = [...allow].filter((key) => !before.has(key) && !actor.has(key)).sort()
  return escalated.length ? { ok: false, reason: 'escalation', escalated } : { ok: true }
}
