import { feedbackOptionsResponseSchema } from '#shared/schemas/lumi-learning'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/feedback/options (Server: lumi.use). Consultas que este usuario puede elegir. */
export default defineEventHandler(async (event) => {
  try {
    return parseUpstream(feedbackOptionsResponseSchema, await serverApi(event, '/api/admin/lumi/feedback/options'), 'GET /admin/lumi/feedback/options')
  } catch (error) {
    toBffError(error)
  }
})
