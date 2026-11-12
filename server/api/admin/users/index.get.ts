import { serverUserListSchema, toRoleSummary, type UserList } from '#shared/schemas/users'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * GET /api/admin/users (Server: admin.users.read → /admin/security/users).
 * `staff=1` filtra al personal (isStaff). El Server ya escapa la búsqueda.
 */
export default defineEventHandler(async (event): Promise<UserList> => {
  try {
    const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
    const staffOnly = getQuery(event).staff === '1'
    const data = parseUpstream(
      serverUserListSchema,
      await serverApi(event, '/api/admin/security/users', {
        query: { page, limit, search, ...(staffOnly ? { staffOnly: 'true' } : {}) },
      }),
      'GET /admin/security/users',
    )
    return {
      items: data.items.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name?.trim() || null,
        legacyRole: u.role,
        isStaff: u.isStaff,
        twoFactorEnabled: u.twoFactorEnabled,
        roles: u.assignedRoles.map(toRoleSummary),
        effectivePermissionCount: u.effectivePermissionCount,
        createdAt: u.createdAt ?? null,
      })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
