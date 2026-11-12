import type { RoleDetail } from '#shared/schemas/roles'
import { readObjectIdParam } from '../../../../utils/request-input'
import { assertRoleDetachable, loadRoleDetail } from '../../../../utils/roles'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** POST /api/admin/roles/:id/archive (Server: admin.roles.manage → POST /roles/archive/:id). */
export default defineEventHandler(async (event): Promise<RoleDetail> => {
  const id = readObjectIdParam(event)
  try {
    assertRoleDetachable(await loadRoleDetail(event, id), 'archive')
    await serverApi(event, `/api/admin/security/roles/archive/${id}`, { method: 'POST' })
    return await loadRoleDetail(event, id)
  } catch (error) {
    toBffError(error)
  }
})
