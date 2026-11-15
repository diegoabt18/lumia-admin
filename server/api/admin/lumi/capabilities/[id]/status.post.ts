import { capabilityResponseSchema, changeCapabilityStatusInputSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/lumi/capabilities/:id/status (Server: lumi.capabilities.manage). Transición validada por el Server. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, changeCapabilityStatusInputSchema)
  try {
    return parseUpstream(
      capabilityResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/status`, { method: 'POST', body: input }),
      'POST /admin/lumi/capabilities/:id/status',
    )
  } catch (error) {
    toBffError(error)
  }
})
