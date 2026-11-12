import { roleAssignBodySchema, type UserDetail } from '#shared/schemas/users'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { loadAdminSession } from '../../../../../utils/session-profile'
import { toBffError } from '../../../../../utils/upstream'
import { assertRoleChangeAllowed, fetchUserDetail, toUserDetail } from '../../../../../utils/users'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/users/:id/roles (Server: admin.users.manage → POST /admin/security/users/:id/roles).
 * Antes de llamar al Server aplica assertRoleChangeAllowed (sin autoasignación ni escalada).
 */
export default defineEventHandler(async (event): Promise<UserDetail> => {
  const id = readObjectIdParam(event)
  const { roleId } = await readValidatedJson(event, roleAssignBodySchema)
  try {
    await assertRoleChangeAllowed(event, id, { add: roleId })
    await serverApi(event, `/api/admin/security/users/${id}/roles`, { method: 'POST', body: { roleId } })
    const [actor, data] = await Promise.all([loadAdminSession(event), fetchUserDetail(event, id)])
    return toUserDetail(data, actor.user.id)
  } catch (error) {
    toBffError(error)
  }
})
