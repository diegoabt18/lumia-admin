import { readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** DELETE /api/admin/lumi/capabilities/:id/phrases/:phraseId (Server: lumi.capabilities.manage). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const phraseId = readObjectIdParam(event, 'phraseId')
  try {
    await serverApi(event, `/api/admin/lumi/capabilities/${id}/phrases/${phraseId}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
