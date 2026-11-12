import { stockBodySchema } from '#shared/schemas/inventory'
import { readObjectIdParam, readSkuParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * PUT /api/admin/products/:id/inventory/:sku (Server: products.update).
 * El Server verifica que la variante pertenezca al producto antes de escribir.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const sku = readSkuParam(event)
  const input = await readValidatedJson(event, stockBodySchema)
  try {
    await serverApi(event, `/api/admin/products/${id}/inventory/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body: input,
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
