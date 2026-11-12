import type { PricingProductDetail } from '#shared/schemas/costing'
import { loadPricingProduct } from '../../../../../../utils/costing'
import { readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** DELETE /api/admin/production/pricing/products/:id/recipe (Server: recipes.update). */
export default defineEventHandler(async (event): Promise<PricingProductDetail> => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/products/${id}/recipe`, { method: 'DELETE' })
    return await loadPricingProduct(event, id)
  } catch (error) {
    toBffError(error)
  }
})
