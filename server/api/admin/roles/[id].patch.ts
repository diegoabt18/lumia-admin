import { rolePatchBodySchema, type RoleDetail } from '#shared/schemas/roles'
import { readObjectIdParam } from '../../../utils/request-input'
import { assertNoEscalation, fetchRole, loadRoleDetail } from '../../../utils/roles'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/roles/:id (Server: admin.roles.manage → PATCH /admin/security/roles/:id).
 * - Rechaza el cambio si el rol cambió desde que se leyó (`version`).
 * - Los permisos nuevos deben estar entre los de quien edita (afectan a todos los usuarios del rol).
 * - Roles de sistema: solo nombre y descripción (el Server también lo exige).
 */
export default defineEventHandler(async (event): Promise<RoleDetail> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, rolePatchBodySchema)
  try {
    const current = await fetchRole(event, id)
    if (current.version !== input.version) {
      throwBffError(409, {
        code: 'ROLE_VERSION_CONFLICT',
        message: 'Otra persona modificó este rol mientras lo editabas. Recarga para ver los cambios.',
      })
    }
    if (current.isArchived) {
      throwBffError(409, { code: 'ROLE_ARCHIVED', message: 'Restaura el rol antes de editarlo.' })
    }

    const body: Record<string, unknown> = {}
    if (input.name !== undefined) body.name = input.name
    if (input.description !== undefined) body.description = input.description
    if (input.permissionKeys !== undefined) {
      const before = [...current.permissionKeys].sort()
      if (before.join(',') !== input.permissionKeys.join(',')) {
        if (current.isSystem) {
          throwBffError(409, { code: 'SYSTEM_ROLE', message: 'Los permisos de un rol de sistema no se pueden cambiar.' })
        }
        await assertNoEscalation(event, input.permissionKeys, current.permissionKeys)
        body.permissionKeys = input.permissionKeys
      }
    }

    if (Object.keys(body).length) {
      await serverApi(event, `/api/admin/security/roles/${id}`, { method: 'PATCH', body })
    }
    return await loadRoleDetail(event, id)
  } catch (error) {
    toBffError(error)
  }
})
