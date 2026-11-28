import { lumiApprovalListQuerySchema, lumiApprovalListSchema, type LumiApproval } from '#shared/schemas/lumi'
import { readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/**
 * GET /api/admin/lumi/approvals?status=pending|all (Server: `GET /api/lumi/approvals`).
 * Solo las aprobaciones del usuario de la sesión, sin los parámetros internos.
 */
export default defineEventHandler(async (event): Promise<{ items: LumiApproval[] }> => {
  const query = readQueryOrThrow(event, lumiApprovalListQuerySchema)
  let data: unknown
  try {
    data = await serverApi(event, '/api/lumi/approvals', { query: { status: query.status, limit: 50 } })
  } catch (error) {
    toBffError(error)
  }
  const parsed = lumiApprovalListSchema.safeParse(data)
  if (!parsed.success) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }
  return { items: parsed.data.items }
})
