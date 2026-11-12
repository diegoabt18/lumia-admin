import { serverRoleListSchema, toRoleSummary, type AssignableRoles } from '#shared/schemas/users'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/users/assignable-roles (Server: admin.roles.read → /admin/security/roles). Sin archivados. */
export default defineEventHandler(async (event): Promise<AssignableRoles> => {
  try {
    const data = parseUpstream(
      serverRoleListSchema,
      await serverApi(event, '/api/admin/security/roles', { query: { page: 1, limit: 100 } }),
      'GET /admin/security/roles',
    )
    return {
      items: data.items.filter((r) => !r.isArchived).map(toRoleSummary),
      truncated: data.pagination.hasNext,
    }
  } catch (error) {
    toBffError(error)
  }
})
