import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** DELETE /api/admin/lumi/knowledge/:id (Server: lumi.learning.manage). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/lumi/knowledge/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
