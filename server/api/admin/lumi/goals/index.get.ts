import { lumiGoalListQuerySchema, lumiGoalListSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/goals?status=active|all (Server: `GET /api/lumi/goals`). Solo los propios. */
export default defineEventHandler(async (event): Promise<{ items: LumiGoal[] }> => {
  const query = readQueryOrThrow(event, lumiGoalListQuerySchema)
  try {
    const data = await serverApi(event, '/api/lumi/goals', { query: { status: query.status } })
    return parseUpstream(lumiGoalListSchema, data, 'GET /lumi/goals')
  } catch (error) {
    toBffError(error)
  }
})
