import { feedbackInputSchema, feedbackResponseSchema } from '#shared/schemas/lumi-learning'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * POST /api/admin/lumi/feedback (Server: lumi.use). «No era esto»: el usuario enseña qué consulta
 * quería para su propia frase. El Server solo acepta consultas que ese usuario ya puede usar.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, feedbackInputSchema)
  try {
    return parseUpstream(
      feedbackResponseSchema,
      await serverApi(event, '/api/admin/lumi/feedback', { method: 'POST', body: input }),
      'POST /admin/lumi/feedback',
    )
  } catch (error) {
    toBffError(error)
  }
})
