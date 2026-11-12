import type { UserDetail } from '#shared/schemas/users'
import { readObjectIdParam } from '../../../utils/request-input'
import { loadAdminSession } from '../../../utils/session-profile'
import { toBffError } from '../../../utils/upstream'
import { fetchUserDetail, toUserDetail } from '../../../utils/users'

/** GET /api/admin/users/:id (Server: admin.users.read → /admin/security/users/:id). */
export default defineEventHandler(async (event): Promise<UserDetail> => {
  const id = readObjectIdParam(event)
  try {
    const [actor, data] = await Promise.all([loadAdminSession(event), fetchUserDetail(event, id)])
    return toUserDetail(data, actor.user.id)
  } catch (error) {
    toBffError(error)
  }
})
