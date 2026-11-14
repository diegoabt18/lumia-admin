import { lumiExecutionListResponseSchema, lumiExecutionsQuerySchema } from '#shared/schemas/lumi-automation'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/automation/executions (Server: lumi.use). Historial de envíos del usuario. */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, lumiExecutionsQuerySchema)
  try {
    return parseUpstream(
      lumiExecutionListResponseSchema,
      await serverApi(event, '/api/admin/lumi/automation/executions', {
        query: { taskId: query.taskId, limit: query.limit },
      }),
      'GET /admin/lumi/automation/executions',
    )
  } catch (error) {
    toBffError(error)
  }
})
