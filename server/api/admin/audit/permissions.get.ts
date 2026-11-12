import { serverPermissionAuditListSchema, type PermissionAuditList } from '#shared/schemas/audit'
import { readDateRange } from '../../../utils/audit'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * GET /api/admin/audit/permissions (Server: admin.audit.read → GET /admin/security/permission-audit).
 * El Server escapa la búsqueda. `before`/`after` (objetos libres) no se reenvían al navegador.
 */
export default defineEventHandler(async (event): Promise<PermissionAuditList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const { from, to } = readDateRange(event)
  try {
    const data = parseUpstream(
      serverPermissionAuditListSchema,
      await serverApi(event, '/api/admin/security/permission-audit', {
        query: { page, limit, search, dateFrom: from, dateTo: to },
      }),
      'GET /admin/security/permission-audit',
    )
    return {
      items: data.items.map((e, index) => ({
        id: e.id ?? `${e.timestamp ?? ''}-${index}`,
        entityType: e.entityType,
        entityLabel: e.entityLabel,
        action: e.action,
        changedBy: e.changedBy,
        changedByEmail: e.changedByEmail ?? null,
        summary: e.summary.slice(0, 500),
        ip: e.ip ?? null,
        at: e.timestamp ?? null,
      })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
