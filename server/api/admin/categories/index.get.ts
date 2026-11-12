import { serverCategoryListSchema, type CategoryList } from '#shared/schemas/categories'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/categories (Server: categories.read). */
export default defineEventHandler(async (event): Promise<CategoryList> => {
  try {
    const query = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: true })
    const data = parseUpstream(
      serverCategoryListSchema,
      await serverApi(event, '/api/admin/categories', { query }),
      'GET /admin/categories',
    )
    return {
      items: data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        createdAt: c.createdAt ?? null,
        productCount: c.productCount,
      })),
      pagination: data.pagination,
    }
  } catch (error) {
    toBffError(error)
  }
})
