import { capabilityResponseSchema, mergeCapabilityInputSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/lumi/capabilities/:id/merge (Server: lumi.capabilities.manage).
 * Fusiona :id en `targetId`; devuelve la capacidad destino.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, mergeCapabilityInputSchema)
  try {
    return parseUpstream(
      capabilityResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/merge`, { method: 'POST', body: input }),
      'POST /admin/lumi/capabilities/:id/merge',
    )
  } catch (error) {
    toBffError(error)
  }
})
