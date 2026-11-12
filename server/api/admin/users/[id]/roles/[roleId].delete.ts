import type { UserDetail } from '#shared/schemas/users'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { loadAdminSession } from '../../../../../utils/session-profile'
import { toBffError } from '../../../../../utils/upstream'
import { assertRoleChangeAllowed, fetchUserDetail, toUserDetail } from '../../../../../utils/users'

/**
 * DELETE /api/admin/users/:id/roles/:roleId
 * (Server: admin.users.manage → DELETE /admin/security/users/:id/roles/:roleId).
 */
export default defineEventHandler(async (event): Promise<UserDetail> => {
  const id = readObjectIdParam(event)
  const roleId = readObjectIdParam(event, 'roleId')
  try {
    await assertRoleChangeAllowed(event, id, { remove: roleId })
    await serverApi(event, `/api/admin/security/users/${id}/roles/${roleId}`, { method: 'DELETE' })
    const [actor, data] = await Promise.all([loadAdminSession(event), fetchUserDetail(event, id)])
    return toUserDetail(data, actor.user.id)
  } catch (error) {
    toBffError(error)
  }
})
