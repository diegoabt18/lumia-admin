import { serverRepostResultSchema, type PricingProductDetail, type RepostResult } from '#shared/schemas/costing'
import { loadPricingProduct } from '../../../../../../utils/costing'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/**
 * POST /api/admin/production/pricing/products/:id/submit
 * (Server: costing.manage → POST /recipes/products/:id/repost-prices).
 * Calcula el costo de cada variante con receta y crea solicitudes de aprobación. No cambia precios.
 */
export default defineEventHandler(async (event): Promise<{ result: RepostResult; product: PricingProductDetail }> => {
  const id = readObjectIdParam(event)
  try {
    const { data } = parseUpstream(
      serverRepostResultSchema,
      await serverApi(event, `/api/admin/production/recipes/products/${id}/repost-prices`, { method: 'POST' }),
      'POST /admin/production/recipes/products/:id/repost-prices',
    )
    return {
      result: {
        reposted: data.reposted,
        skipped: data.skipped,
        errors: data.errors.map((e) => e.slice(0, 300)),
        results: data.results.map((r) => ({
          variantSku: r.variantSku,
          suggestedPrice: r.suggestedPrice,
          currentPrice: r.currentPrice,
          skipped: r.skipped === true,
          skipReason: r.skipReason ?? null,
        })),
      },
      product: await loadPricingProduct(event, id),
    }
  } catch (error) {
    toBffError(error)
  }
})
