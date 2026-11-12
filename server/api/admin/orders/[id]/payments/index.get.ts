import { serverOrderPaymentSummarySchema } from '#shared/schemas/orders'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/orders/:id/payments: pagado, saldo y reparto por línea (Server: orders.read). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      serverOrderPaymentSummarySchema,
      await serverApi(event, `/api/admin/orders/${id}/payments`),
      'GET /admin/orders/:id/payments',
    )
  } catch (error) {
    toBffError(error)
  }
})
