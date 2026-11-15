import { knowledgeResponseSchema } from '#shared/schemas/lumi-learning'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** POST /api/admin/lumi/knowledge/:id/promote (Server: lumi.learning.manage). Hacer global. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      knowledgeResponseSchema,
      await serverApi(event, `/api/admin/lumi/knowledge/${id}/promote`, { method: 'POST', body: {} }),
      'POST /admin/lumi/knowledge/:id/promote',
    )
  } catch (error) {
    toBffError(error)
  }
})
