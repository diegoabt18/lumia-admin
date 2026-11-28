import { lumiGoalIdSchema, lumiGoalPlanSchema, type LumiGoalPlan } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** POST /api/admin/lumi/goals/:id/plan (Server: `POST /api/lumi/goals/:id/plan`). Pide pasos a la IA: queda una aprobación `goal_plan`, no añade nada. */
export default defineEventHandler(async (event): Promise<LumiGoalPlan> => {
  const id = readValidatedParam(event, 'id', lumiGoalIdSchema)
  try {
    const data = await serverApi(event, `/api/lumi/goals/${id}/plan`, { method: 'POST' })
    return parseUpstream(lumiGoalPlanSchema, data, 'POST /lumi/goals/:id/plan')
  } catch (error) {
    toBffError(error)
  }
})
