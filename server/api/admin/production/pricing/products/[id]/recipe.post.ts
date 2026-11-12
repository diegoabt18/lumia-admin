import { assignRecipeBodySchema, type PricingProductDetail } from '#shared/schemas/costing'
import { assertRecipeAssignable, loadPricingProduct } from '../../../../../../utils/costing'
import { readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/** POST /api/admin/production/pricing/products/:id/recipe (Server: recipes.update → POST /admin/products/:id/recipe). */
export default defineEventHandler(async (event): Promise<PricingProductDetail> => {
  const id = readObjectIdParam(event)
  const { recipeId } = await readValidatedJson(event, assignRecipeBodySchema)
  try {
    await assertRecipeAssignable(event, recipeId)
    await serverApi(event, `/api/admin/products/${id}/recipe`, { method: 'POST', body: { recipeId } })
    return await loadPricingProduct(event, id)
  } catch (error) {
    toBffError(error)
  }
})
