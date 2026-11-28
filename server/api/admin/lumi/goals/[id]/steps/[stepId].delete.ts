import { lumiGoalIdSchema, lumiGoalSchema, lumiGoalStepIdSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** DELETE /api/admin/lumi/goals/:id/steps/:stepId (Server: igual). Quita el paso y cierra su recordatorio. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  const stepId = readValidatedParam(event, 'stepId', lumiGoalStepIdSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}/steps/${stepId}`, { method: 'DELETE' })
    return parseUpstream(lumiGoalSchema, data, 'DELETE /lumi/goals/:id/steps/:stepId')
  } catch (error) {
    toBffError(error)
  }
})
