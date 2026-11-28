import { lumiGoalIdSchema, lumiGoalSchema, lumiGoalStatusSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/lumi/goals/:id/status (Server: `POST /api/lumi/goals/:id/status`). Logrado, abandonado o activo. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  const input = await readValidatedJson(event, lumiGoalStatusSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}/status`, { method: 'POST', body: input })
    return parseUpstream(lumiGoalSchema, data, 'POST /lumi/goals/:id/status')
  } catch (error) {
    toBffError(error)
  }
})
