import { serverRecipeProductsSchema, type RecipeProductOption } from '#shared/schemas/recipes'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/production/recipe-products?search= (Server: recipes.read → /recipes/products). Selector de producto. */
export default defineEventHandler(async (event): Promise<{ items: RecipeProductOption[] }> => {
  const { search } = readListQuery(event, { allowedLimits: [20], escapeSearch: false })
  try {
    const data = parseUpstream(
      serverRecipeProductsSchema,
      await serverApi(event, '/api/admin/production/recipes/products', { query: { search, limit: 20, page: 1 } }),
      'GET /admin/production/recipes/products',
    )
    return { items: data.data.map((p) => ({ slug: p.slug, name: p.name, hasRecipe: p.hasRecipe === true })) }
  } catch (error) {
    toBffError(error)
  }
})
