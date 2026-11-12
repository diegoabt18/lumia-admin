import { serverProductListSchema, type ProductList } from '#shared/schemas/products'
import { toProductRow } from '../../../utils/products'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/products (Server: products.read). El Server solo filtra por búsqueda. */
export default defineEventHandler(async (event): Promise<ProductList> => {
  try {
    const query = readListQuery(event, { allowedLimits: [20, 50, 100], escapeSearch: true })
    const data = parseUpstream(
      serverProductListSchema,
      await serverApi(event, '/api/admin/products', { query }),
      'GET /admin/products',
    )
    return { items: data.products.map(toProductRow), pagination: data.pagination }
  } catch (error) {
    toBffError(error)
  }
})
