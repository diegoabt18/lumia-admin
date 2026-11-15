import { capabilityResponseSchema, updateCapabilityInputSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/lumi/capabilities/:id (Server: lumi.capabilities.manage). Datos y especificación. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, updateCapabilityInputSchema)
  try {
    return parseUpstream(
      capabilityResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/lumi/capabilities/:id',
    )
  } catch (error) {
    toBffError(error)
  }
})
