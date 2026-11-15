import { enablementResponseSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/lumi/capabilities/:id/enablement (Server: lumi.capabilities.read). Requisitos para habilitar. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      enablementResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/enablement`),
      'GET /admin/lumi/capabilities/:id/enablement',
    )
  } catch (error) {
    toBffError(error)
  }
})
