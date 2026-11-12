import { serverProductListSchema, type ProductList } from '#shared/schemas/products'
import { toProductRow } from '../../../utils/products'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/products (Server: products.read). El Server solo filtra por búsqueda. */
export default defineEventHandler(async (event): Promise<ProductList> => {
  try {
    const list = readListQuery(event, { allowedLimits: [20, 50, 100], escapeSearch: true })
    // Jerarquía: el Server resuelve categoría y subcategoría (la subcategoría manda).
    const params = getQuery(event)
    const category = typeof params.category === 'string' ? params.category.trim().slice(0, 80) : ''
    const subcategory = typeof params.subcategory === 'string' ? params.subcategory.trim().slice(0, 80) : ''
    const query = {
      ...list,
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
    }
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
