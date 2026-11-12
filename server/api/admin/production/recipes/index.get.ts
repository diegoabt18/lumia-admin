import { serverRecipeListSchema, toRecipeRow, type RecipeList } from '#shared/schemas/recipes'
import { toAdminPagination } from '#shared/schemas/production'
import { parseUpstream, readListQuery } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/recipes (Server: recipes.read). `outdated=1` solo desactualizadas. */
export default defineEventHandler(async (event): Promise<RecipeList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const outdatedOnly = getQuery(event).outdated === '1' ? 'true' : undefined
  try {
    const data = parseUpstream(
      serverRecipeListSchema,
      await serverApi(event, '/api/admin/production/recipes', { query: { page, limit, search, outdatedOnly } }),
      'GET /admin/production/recipes',
    )
    return { items: data.data.map(toRecipeRow), pagination: toAdminPagination(data.meta, limit) }
  } catch (error) {
    toBffError(error)
  }
})
