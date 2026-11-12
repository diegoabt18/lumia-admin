import type { OrderDetail } from '#shared/schemas/orders'
import { fetchOrderDetail, toOrderDetail } from '../../../utils/orders'
import { readObjectIdParam } from '../../../utils/request-input'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/orders/:id (Server: orders.read). */
export default defineEventHandler(async (event): Promise<OrderDetail> => {
  const id = readObjectIdParam(event)
  try {
    return toOrderDetail(await fetchOrderDetail(event, id))
  } catch (error) {
    toBffError(error)
  }
})
