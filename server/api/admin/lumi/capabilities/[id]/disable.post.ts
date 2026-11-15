import { capabilityResponseSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** POST /api/admin/lumi/capabilities/:id/disable (Server: lumi.capabilities.enable). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      capabilityResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/disable`, { method: 'POST', body: {} }),
      'POST /admin/lumi/capabilities/:id/disable',
    )
  } catch (error) {
    toBffError(error)
  }
})
