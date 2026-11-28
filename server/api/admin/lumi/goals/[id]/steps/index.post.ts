import { lumiGoalIdSchema, lumiGoalSchema, lumiGoalStepCreateSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/** POST /api/admin/lumi/goals/:id/steps (Server: `POST /api/lumi/goals/:id/steps`). Paso con recordatorio opcional. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  const input = await readValidatedJson(event, lumiGoalStepCreateSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}/steps`, { method: 'POST', body: input })
    return parseUpstream(lumiGoalSchema, data, 'POST /lumi/goals/:id/steps')
  } catch (error) {
    toBffError(error)
  }
})
