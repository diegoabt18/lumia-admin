import { depositPolicyBodySchema } from '#shared/schemas/inventory'
import { readSkuParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * PUT /api/admin/inventory/:sku/deposit-policy (Server: products.update).
 * Envía solo la política; el Server conserva el stock actual cuando no se envía `quantity`.
 */
export default defineEventHandler(async (event) => {
  const sku = readSkuParam(event)
  const input = await readValidatedJson(event, depositPolicyBodySchema)
  try {
    await serverApi(event, `/api/admin/inventory/${encodeURIComponent(sku)}`, { method: 'PUT', body: input })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
