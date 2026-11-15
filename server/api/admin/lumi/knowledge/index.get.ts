import { knowledgeListQuerySchema, knowledgeListResponseSchema } from '#shared/schemas/lumi-learning'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/knowledge (Server: lumi.learning.read). Búsqueda literal (el Server la escapa). */
export default defineEventHandler(async (event) => {
  const q = readQueryOrThrow(event, knowledgeListQuerySchema)
  try {
    return parseUpstream(
      knowledgeListResponseSchema,
      await serverApi(event, '/api/admin/lumi/knowledge', {
        query: { page: q.page, limit: q.limit, search: q.search || undefined, scope: q.scope, status: q.status },
      }),
      'GET /admin/lumi/knowledge',
    )
  } catch (error) {
    toBffError(error)
  }
})
