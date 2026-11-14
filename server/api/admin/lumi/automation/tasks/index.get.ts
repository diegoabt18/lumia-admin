import { lumiListTasksQuerySchema, lumiTaskListResponseSchema } from '#shared/schemas/lumi-automation'
import { parseUpstream, readQueryOrThrow } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/lumi/automation/tasks (Server: lumi.use). Solo las tareas del usuario. */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, lumiListTasksQuerySchema)
  try {
    return parseUpstream(
      lumiTaskListResponseSchema,
      await serverApi(event, '/api/admin/lumi/automation/tasks', { query: { status: query.status } }),
      'GET /admin/lumi/automation/tasks',
    )
  } catch (error) {
    toBffError(error)
  }
})
