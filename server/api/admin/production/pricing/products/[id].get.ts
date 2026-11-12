import type { PricingProductDetail } from '#shared/schemas/costing'
import { loadPricingProduct } from '../../../../../utils/costing'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/production/pricing/products/:id (Server: products.read → /admin/products/:id). */
export default defineEventHandler(async (event): Promise<PricingProductDetail> => {
  const id = readObjectIdParam(event)
  try {
    return await loadPricingProduct(event, id)
  } catch (error) {
    toBffError(error)
  }
})
