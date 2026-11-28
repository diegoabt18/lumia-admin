import {
  lumiApprovalIdSchema,
  lumiApprovalResolveResultSchema,
  lumiApprovalResolveSchema,
  type LumiApprovalResolveResult,
} from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/lumi/approvals/:id/resolve (Server: `POST /api/lumi/approvals/:id/resolve`).
 * Aprueba o rechaza una acción pendiente de Lumi, una sola vez. `paramsHash` es obligatorio aquí: se
 * resuelve exactamente lo que se mostró (el Server responde 409 si cambió o ya se resolvió).
 */
export default defineEventHandler(async (event): Promise<LumiApprovalResolveResult> => {
  const id = readValidatedParam(event, 'id', lumiApprovalIdSchema)
  const input = await readValidatedJson(event, lumiApprovalResolveSchema)
  try {
    const data = await serverApi(event, `/api/lumi/approvals/${id}/resolve`, { method: 'POST', body: input })
    return parseUpstream(lumiApprovalResolveResultSchema, data, 'POST /lumi/approvals/:id/resolve')
  } catch (error) {
    toBffError(error)
  }
})
