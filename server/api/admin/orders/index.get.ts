import { serverOrderListSchema, type OrderList } from '#shared/schemas/orders'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * GET /api/admin/orders (Server: orders.read).
 * Filtros que soporta el Server: búsqueda (número, cliente, email, teléfono) y canal (online/pos).
 */
export default defineEventHandler(async (event): Promise<OrderList> => {
  try {
    const query = readListQuery(event, { allowedLimits: [20, 50, 100], escapeSearch: true })
    const channelRaw = getQuery(event).channel
    const channel = channelRaw === 'online' || channelRaw === 'pos' ? channelRaw : undefined

    const data = parseUpstream(
      serverOrderListSchema,
      await serverApi(event, '/api/admin/orders', { query: { ...query, channel } }),
      'GET /admin/orders',
    )
    return {
      items: data.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber ?? null,
        customerReference: o.customerReference ?? null,
        customer: o.userName ?? null,
        contact: o.userEmail ?? o.phone ?? null,
        itemCount: o.items.length,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus ?? null,
        channel: o.channel,
        createdAt: o.createdAt ?? null,
        cancellationRequestStatus: o.cancellationRequestStatus ?? null,
      })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
