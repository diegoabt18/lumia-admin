import { z } from 'zod'
import { promotionBodySchema } from '#shared/schemas/promotions'
import { toServerPromotionBody } from '../../../utils/promotions'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/promotions (Server: products.update). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, promotionBodySchema)
  try {
    const data = parseUpstream(
      z.object({ id: z.string() }),
      await serverApi(event, '/api/admin/promotions', { method: 'POST', body: toServerPromotionBody(input) }),
      'POST /admin/promotions',
    )
    return { id: data.id }
  } catch (error) {
    toBffError(error)
  }
})
