import { capabilityResponseSchema, enableCapabilityInputSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/lumi/capabilities/:id/enable (Server: lumi.capabilities.enable).
 * El Server vuelve a comprobar todos los requisitos; aquí solo se exige la confirmación.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, enableCapabilityInputSchema)
  try {
    return parseUpstream(
      capabilityResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/enable`, { method: 'POST', body: input }),
      'POST /admin/lumi/capabilities/:id/enable',
    )
  } catch (error) {
    toBffError(error)
  }
})
