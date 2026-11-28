import { lumiGoalIdSchema, lumiGoalSchema, lumiGoalUpdateSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/lumi/goals/:id (Server: `PATCH /api/lumi/goals/:id`). Título, descripción o fecha. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  const input = await readValidatedJson(event, lumiGoalUpdateSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}`, { method: 'PATCH', body: input })
    return parseUpstream(lumiGoalSchema, data, 'PATCH /lumi/goals/:id')
  } catch (error) {
    toBffError(error)
  }
})
