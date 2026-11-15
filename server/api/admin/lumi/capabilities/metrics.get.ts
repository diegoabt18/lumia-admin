import { turnMetricsQuerySchema, turnMetricsSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/metrics (Server: lumi.capabilities.read). Contadores sin texto ni usuario. */
export default defineEventHandler(async (event) => {
  const { days } = readQueryOrThrow(event, turnMetricsQuerySchema)
  try {
    return parseUpstream(
      turnMetricsSchema,
      await serverApi(event, '/api/admin/lumi/capabilities/metrics', { query: { days } }),
      'GET /admin/lumi/capabilities/metrics',
    )
  } catch (error) {
    toBffError(error)
  }
})
