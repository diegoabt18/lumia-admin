import { lumiConversationsResponseSchema, lumiListQuerySchema } from '#shared/schemas/lumi'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/conversations (Server: lumi.use). Solo las conversaciones del usuario. */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, lumiListQuerySchema)
  try {
    return parseUpstream(
      lumiConversationsResponseSchema,
      await serverApi(event, '/api/admin/lumi/conversations', { query: { limit: query.limit, offset: query.offset } }),
      'GET /admin/lumi/conversations',
    )
  } catch (error) {
    toBffError(error)
  }
})
