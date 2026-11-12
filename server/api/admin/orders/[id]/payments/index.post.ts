import { orderPaymentRegisterBodySchema, serverOrderPaymentSummarySchema } from '#shared/schemas/orders'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/orders/:id/payments: registra un abono en efectivo o transferencia
 * (Server: orders.update). El importe y el saldo los valida el Server, no la interfaz.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, orderPaymentRegisterBodySchema)
  try {
    return parseUpstream(
      serverOrderPaymentSummarySchema,
      await serverApi(event, `/api/admin/orders/${id}/payments`, { method: 'POST', body: input }),
      'POST /admin/orders/:id/payments',
    )
  } catch (error) {
    toBffError(error)
  }
})
