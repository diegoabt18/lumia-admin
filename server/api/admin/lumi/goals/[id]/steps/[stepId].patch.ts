import { lumiGoalIdSchema, lumiGoalSchema, lumiGoalStepIdSchema, lumiGoalStepUpdateSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/** PATCH /api/admin/lumi/goals/:id/steps/:stepId (Server: igual). Completar, reabrir o renombrar. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  const stepId = readValidatedParam(event, 'stepId', lumiGoalStepIdSchema)
  const input = await readValidatedJson(event, lumiGoalStepUpdateSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}/steps/${stepId}`, { method: 'PATCH', body: input })
    return parseUpstream(lumiGoalSchema, data, 'PATCH /lumi/goals/:id/steps/:stepId')
  } catch (error) {
    toBffError(error)
  }
})
