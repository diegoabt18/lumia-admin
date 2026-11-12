import { rejectBodySchema } from '#shared/schemas/costing'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/production/approvals/:id/reject (Server: costing.manage). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const { reason } = await readValidatedJson(event, rejectBodySchema)
  try {
    await serverApi(event, '/api/admin/production/approvals/reject', { method: 'POST', body: { approvalIds: [id], reason } })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
