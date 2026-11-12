import { REPOST_STATUSES, serverPricingProductListSchema, type PricingProductList } from '#shared/schemas/costing'
import { toAdminPagination } from '#shared/schemas/production'
import { parseUpstream, readListQuery } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/production/pricing/products (Server: recipes.read → /recipes/products). `status` filtra por estado de publicación. */
export default defineEventHandler(async (event): Promise<PricingProductList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const raw = getQuery(event).status
  const repostStatus = (REPOST_STATUSES as readonly unknown[]).includes(raw) ? String(raw) : undefined
  try {
    const data = parseUpstream(
      serverPricingProductListSchema,
      await serverApi(event, '/api/admin/production/recipes/products', { query: { page, limit, search, repostStatus } }),
      'GET /admin/production/recipes/products',
    )
    return {
      items: data.data.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        variantCount: p.variantCount,
        recipeId: p.productionRecipeId ?? null,
        recipeName: p.recipeName ?? null,
        recipeVersion: p.recipeVersion ?? null,
        variantRecipeCount: p.variantRecipeCount,
        costsOutdated: p.costsOutdated,
        repostStatus: p.repostStatus,
        variantsNeedingRepost: p.variantsNeedingRepost,
        variantsPendingApproval: p.variantsPendingApproval,
      })),
      pagination: toAdminPagination(data.meta, limit),
    }
  } catch (error) {
    toBffError(error)
  }
})
