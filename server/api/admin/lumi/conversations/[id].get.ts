import { lumiConversationDetailResponseSchema, lumiConversationIdSchema } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/conversations/:id (Server: lumi.use; 404 si no es del usuario). */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', lumiConversationIdSchema)
  try {
    return parseUpstream(
      lumiConversationDetailResponseSchema,
      await serverApi(event, `/api/admin/lumi/conversations/${id}`),
      'GET /admin/lumi/conversations/:id',
    )
  } catch (error) {
    toBffError(error)
  }
})
