import { orderNotesBodySchema } from '#shared/schemas/orders'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** Notas internas del pedido → PATCH /api/admin/orders/:id `{ notes }` (orders.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, orderNotesBodySchema)
  try {
    await serverApi(event, `/api/admin/orders/${id}`, { method: 'PATCH', body: { notes: input.notes } })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
