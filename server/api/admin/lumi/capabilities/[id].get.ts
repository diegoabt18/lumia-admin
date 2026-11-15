import { capabilityDetailSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/:id (Server: lumi.capabilities.read). Frases sin autor. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      capabilityDetailSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}`),
      'GET /admin/lumi/capabilities/:id',
    )
  } catch (error) {
    toBffError(error)
  }
})
