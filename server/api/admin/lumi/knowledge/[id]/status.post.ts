import { changeKnowledgeStatusInputSchema, knowledgeResponseSchema } from '#shared/schemas/lumi-learning'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/lumi/knowledge/:id/status (Server: lumi.learning.manage). Transición validada por el Server. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, changeKnowledgeStatusInputSchema)
  try {
    return parseUpstream(
      knowledgeResponseSchema,
      await serverApi(event, `/api/admin/lumi/knowledge/${id}/status`, { method: 'POST', body: input }),
      'POST /admin/lumi/knowledge/:id/status',
    )
  } catch (error) {
    toBffError(error)
  }
})
