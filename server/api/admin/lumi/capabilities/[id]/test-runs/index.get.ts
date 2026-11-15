import { runListResponseSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/:id/test-runs (Server: lumi.capabilities.read). Últimas 20, sin detalle. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      runListResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/test-runs`),
      'GET /admin/lumi/capabilities/:id/test-runs',
    )
  } catch (error) {
    toBffError(error)
  }
})
