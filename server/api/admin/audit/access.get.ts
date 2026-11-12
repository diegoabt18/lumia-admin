import {
  AUTH_AUDIT_EVENTS,
  serverAuthAuditListSchema,
  type AuthAuditEvent,
  type AuthAuditList,
} from '#shared/schemas/audit'
import { readDateRange } from '../../../utils/audit'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

const isEvent = (v: unknown): v is AuthAuditEvent => (AUTH_AUDIT_EVENTS as readonly unknown[]).includes(v)

/**
 * GET /api/admin/audit/access (Server: admin.audit.read → GET /admin/audit-log).
 * El Server escapa la búsqueda e ignora `event` cuando hay búsqueda: aquí no se envían juntos.
 */
export default defineEventHandler(async (event): Promise<AuthAuditList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const { from, to } = readDateRange(event)
  const rawEvent = getQuery(event).event
  const auditEvent = !search && isEvent(rawEvent) ? rawEvent : undefined
  try {
    const data = parseUpstream(
      serverAuthAuditListSchema,
      await serverApi(event, '/api/admin/audit-log', { query: { page, limit, search, event: auditEvent, from, to } }),
      'GET /admin/audit-log',
    )
    return {
      items: data.items.map((e, index) => ({
        id: e._id ?? `${e.timestamp ?? ''}-${index}`,
        event: isEvent(e.event) ? e.event : 'unknown',
        userId: e.userId ?? null,
        email: e.email ?? null,
        ip: e.ip ?? null,
        userAgent: e.userAgent ? e.userAgent.slice(0, 300) : null,
        via2fa: e.metadata?.via2fa === true,
        reuseDetected: e.metadata?.reuseDetected === true,
        at: e.timestamp ?? null,
      })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
