import { serverInventoryListSchema, type InventoryList } from '#shared/schemas/inventory'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/inventory (Server: products.read). Búsqueda por SKU o bodega (el Server escapa). */
export default defineEventHandler(async (event): Promise<InventoryList> => {
  try {
    const query = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
    const data = parseUpstream(
      serverInventoryListSchema,
      await serverApi(event, '/api/admin/inventory', { query }),
      'GET /admin/inventory',
    )
    return {
      items: data.items.map((i) => ({ ...i, updatedAt: i.updatedAt ?? null })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
