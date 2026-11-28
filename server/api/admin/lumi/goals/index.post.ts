import { lumiGoalCreateSchema, lumiGoalSchema, type LumiGoal } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/lumi/goals (Server: `POST /api/lumi/goals`). Objetivo nuevo. */
export default defineEventHandler(async (event): Promise<LumiGoal> => {
  const input = await readValidatedJson(event, lumiGoalCreateSchema)
  try {
    const data = await serverApi(event, '/api/lumi/goals', { method: 'POST', body: input })
    return parseUpstream(lumiGoalSchema, data, 'POST /lumi/goals')
  } catch (error) {
    toBffError(error)
  }
})
