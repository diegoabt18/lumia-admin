import { allowedTransitions, ORDER_STATUS_LABELS, orderStatusBodySchema } from '#shared/schemas/orders'
import { fetchOrderDetail } from '../../../../utils/orders'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * Cambio de estado de un pedido → PATCH /api/admin/orders/:id del Server (orders.update).
 *
 * El Server no valida el flujo de estados; el BFF vuelve a leer el pedido y solo deja pasar
 * las transiciones de `allowedTransitions` (también evita actuar sobre un estado ya cambiado
 * por otra persona desde que se cargó la pantalla).
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, orderStatusBodySchema)
  try {
    const current = await fetchOrderDetail(event, id)
    const allowed = allowedTransitions({ status: current.status, paymentStatus: current.paymentStatus ?? null })
    if (!allowed.includes(input.status)) {
      throwBffError(409, {
        code: 'INVALID_TRANSITION',
        message: `No se puede pasar de "${ORDER_STATUS_LABELS[current.status]}" a "${ORDER_STATUS_LABELS[input.status]}". Recarga el pedido.`,
      })
    }
    await serverApi(event, `/api/admin/orders/${id}`, {
      method: 'PATCH',
      body: {
        status: input.status,
        ...(input.status === 'cancelled' && input.cancellationReason ? { cancellationReason: input.cancellationReason } : {}),
      },
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
