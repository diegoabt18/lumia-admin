import { stockBodySchema } from '#shared/schemas/inventory'
import { readSkuParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PUT /api/admin/inventory/:sku (Server: products.update).
 * El Server hace upsert: con un SKU inexistente CREARÍA un registro nuevo. La interfaz solo
 * llama a este endpoint con SKUs que vienen del propio listado de inventario.
 */
export default defineEventHandler(async (event) => {
  const sku = readSkuParam(event)
  const input = await readValidatedJson(event, stockBodySchema)
  try {
    await serverApi(event, `/api/admin/inventory/${encodeURIComponent(sku)}`, { method: 'PUT', body: input })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
