import { promotionActiveBodySchema } from '#shared/schemas/promotions'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/promotions/:id/active (Server: products.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, promotionActiveBodySchema)
  try {
    await serverApi(event, `/api/admin/promotions/${id}/active`, { method: 'PATCH', body: input })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
