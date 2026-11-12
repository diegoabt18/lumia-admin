import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** POST /api/admin/production/approvals/:id/approve (Server: costing.manage). Una solicitud por llamada. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, '/api/admin/production/approvals/approve', { method: 'POST', body: { approvalIds: [id] } })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
