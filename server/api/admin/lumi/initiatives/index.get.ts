import { initiativeListQuerySchema, initiativeListResponseSchema } from '#shared/schemas/lumi-initiatives'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/initiatives (Server: lumi.use). Iniciativas del propio usuario. */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, initiativeListQuerySchema)
  try {
    return parseUpstream(
      initiativeListResponseSchema,
      await serverApi(event, '/api/admin/lumi/initiatives', { query: { state: query.state, limit: query.limit } }),
      'GET /admin/lumi/initiatives',
    )
  } catch (error) {
    toBffError(error)
  }
})
