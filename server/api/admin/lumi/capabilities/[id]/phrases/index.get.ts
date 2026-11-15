import { phraseListResponseSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/:id/phrases (Server: lumi.capabilities.read). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      phraseListResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/phrases`),
      'GET /admin/lumi/capabilities/:id/phrases',
    )
  } catch (error) {
    toBffError(error)
  }
})
