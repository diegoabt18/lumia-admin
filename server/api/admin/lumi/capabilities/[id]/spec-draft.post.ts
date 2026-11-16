import { capabilitySpecDraftResponseSchema } from '#shared/schemas/lumi-capabilities'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/**
 * POST /api/admin/lumi/capabilities/:id/spec-draft (Server: lumi.capabilities.manage).
 * Devuelve un borrador de especificación hecho con IA. No modifica la capacidad.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      capabilitySpecDraftResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/spec-draft`, { method: 'POST', body: {} }),
      'POST /admin/lumi/capabilities/:id/spec-draft',
    )
  } catch (error) {
    toBffError(error)
  }
})
