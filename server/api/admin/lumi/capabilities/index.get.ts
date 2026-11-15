import { capabilityListQuerySchema, capabilityListResponseSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/**
 * GET /api/admin/lumi/capabilities (Server: lumi.capabilities.read).
 * Filtros por estado, módulo y prioridad; búsqueda literal (el Server la escapa).
 */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, capabilityListQuerySchema)
  try {
    return parseUpstream(
      capabilityListResponseSchema,
      await serverApi(event, '/api/admin/lumi/capabilities', {
        query: {
          page: query.page,
          limit: query.limit,
          search: query.search || undefined,
          status: query.status,
          module: query.module,
          priority: query.priority,
          sort: query.sort,
        },
      }),
      'GET /admin/lumi/capabilities',
    )
  } catch (error) {
    toBffError(error)
  }
})
