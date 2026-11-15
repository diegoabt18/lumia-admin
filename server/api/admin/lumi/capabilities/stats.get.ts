import { capabilityStatsSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/stats (Server: lumi.capabilities.read). */
export default defineEventHandler(async (event) => {
  try {
    return parseUpstream(
      capabilityStatsSchema,
      await serverApi(event, '/api/admin/lumi/capabilities/stats'),
      'GET /admin/lumi/capabilities/stats',
    )
  } catch (error) {
    toBffError(error)
  }
})
