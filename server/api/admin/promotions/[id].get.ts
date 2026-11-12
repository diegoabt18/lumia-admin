import { serverPromotionDetailSchema, type PromotionDetail } from '#shared/schemas/promotions'
import { toPromotionDetail } from '../../../utils/promotions'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/promotions/:id (Server: products.read). */
export default defineEventHandler(async (event): Promise<PromotionDetail> => {
  const id = readObjectIdParam(event)
  try {
    const data = parseUpstream(
      serverPromotionDetailSchema,
      await serverApi(event, `/api/admin/promotions/${id}`),
      'GET /admin/promotions/:id',
    )
    return toPromotionDetail(data.promotion)
  } catch (error) {
    toBffError(error)
  }
})
