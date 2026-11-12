import { cancellationResolveBodySchema } from '#shared/schemas/orders'
import { fetchOrderDetail } from '../../../../utils/orders'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

const OPEN_REQUEST_STATES = new Set(['requested', 'info_needed'])

/**
 * Resolver una solicitud de cancelación del cliente → PATCH /api/admin/orders/:id/cancellation
 * (orders.update). El Server no comprueba que exista una solicitud abierta: lo verifica el BFF.
 * `approved` cancela el pedido y repone stock en el Server.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, cancellationResolveBodySchema)
  try {
    const current = await fetchOrderDetail(event, id)
    if (!current.cancellationRequestStatus || !OPEN_REQUEST_STATES.has(current.cancellationRequestStatus)) {
      throwBffError(409, {
        code: 'NO_OPEN_CANCELLATION_REQUEST',
        message: 'Este pedido no tiene una solicitud de cancelación abierta. Recarga el pedido.',
      })
    }
    await serverApi(event, `/api/admin/orders/${id}/cancellation`, {
      method: 'PATCH',
      body: { resolution: input.resolution, ...(input.adminNote ? { adminNote: input.adminNote } : {}) },
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
