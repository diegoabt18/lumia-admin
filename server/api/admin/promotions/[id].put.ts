import { promotionBodySchema, serverPromotionDetailSchema } from '#shared/schemas/promotions'
import { toServerPromotionBody } from '../../../utils/promotions'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * Editar promoción → PATCH /api/admin/promotions/:id (Server: products.update).
 * El Server REEMPLAZA el documento: se lee el actual para conservar la imagen de notificación,
 * que esta interfaz no edita.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, promotionBodySchema)
  try {
    const current = parseUpstream(
      serverPromotionDetailSchema,
      await serverApi(event, `/api/admin/promotions/${id}`),
      'GET /admin/promotions/:id',
    ).promotion
    await serverApi(event, `/api/admin/promotions/${id}`, {
      method: 'PATCH',
      body: toServerPromotionBody(input, current),
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
