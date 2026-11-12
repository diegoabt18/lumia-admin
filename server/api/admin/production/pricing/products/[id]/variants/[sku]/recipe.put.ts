import { variantRecipeBodySchema, type PricingProductDetail } from '#shared/schemas/costing'
import { assertRecipeAssignable, loadPricingProduct } from '../../../../../../../../utils/costing'
import { readObjectIdParam, readSkuParam } from '../../../../../../../../utils/request-input'
import { serverApi } from '../../../../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../../../utils/validation'

/**
 * PUT /api/admin/production/pricing/products/:id/variants/:sku/recipe
 * (Server: products.update → PATCH /admin/products/:id/variants/:sku/recipe). `recipeId: null` = usar la del producto.
 */
export default defineEventHandler(async (event): Promise<PricingProductDetail> => {
  const id = readObjectIdParam(event)
  const sku = readSkuParam(event)
  const { recipeId } = await readValidatedJson(event, variantRecipeBodySchema)
  try {
    const product = await loadPricingProduct(event, id)
    if (!product.variants.some((v) => v.sku === sku)) {
      throwBffError(404, { code: 'VARIANT_NOT_FOUND', message: 'La variante no pertenece a este producto.' })
    }
    if (recipeId) await assertRecipeAssignable(event, recipeId)
    await serverApi(event, `/api/admin/products/${id}/variants/${encodeURIComponent(sku)}/recipe`, { method: 'PATCH', body: { recipeId } })
    return await loadPricingProduct(event, id)
  } catch (error) {
    toBffError(error)
  }
})
