import { serverPromotionListSchema, type PromotionList } from '#shared/schemas/promotions'
import { toPromotionRow } from '../../../utils/promotions'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/promotions (Server: products.read). Filtro `lifecycle`; la búsqueda la escapa el Server. */
export default defineEventHandler(async (event): Promise<PromotionList> => {
  try {
    const query = readListQuery(event, { allowedLimits: [20, 50, 100], escapeSearch: false })
    const lc = getQuery(event).lifecycle
    const lifecycle = lc === 'pendiente' || lc === 'activa' || lc === 'finalizada' ? lc : undefined
    const data = parseUpstream(
      serverPromotionListSchema,
      await serverApi(event, '/api/admin/promotions', { query: { ...query, lifecycle } }),
      'GET /admin/promotions',
    )
    return { items: data.promotions.map(toPromotionRow), pagination: data.pagination }
  } catch (error) {
    toBffError(error)
  }
})
