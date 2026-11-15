import { runResponseSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/:id/test-runs/:runId (Server: lumi.capabilities.read). Detalle por frase. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const runId = readObjectIdParam(event, 'runId')
  try {
    return parseUpstream(
      runResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/test-runs/${runId}`),
      'GET /admin/lumi/capabilities/:id/test-runs/:runId',
    )
  } catch (error) {
    toBffError(error)
  }
})
