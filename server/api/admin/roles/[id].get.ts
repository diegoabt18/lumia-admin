import type { RoleDetail } from '#shared/schemas/roles'
import { readObjectIdParam } from '../../../utils/request-input'
import { loadRoleDetail } from '../../../utils/roles'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/roles/:id (Server: admin.roles.read). */
export default defineEventHandler(async (event): Promise<RoleDetail> => {
  const id = readObjectIdParam(event)
  try {
    return await loadRoleDetail(event, id)
  } catch (error) {
    toBffError(error)
  }
})
