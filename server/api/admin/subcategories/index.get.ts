import { serverSubcategoryRowListSchema, type SubcategoryList } from '#shared/schemas/categories'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/subcategories?category=&search=&page=&limit= (Server: categories.read). */
export default defineEventHandler(async (event): Promise<SubcategoryList> => {
  try {
    const list = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
    const rawCategory = getQuery(event).category
    const category = typeof rawCategory === 'string' ? rawCategory.trim().slice(0, 80) : ''
    const data = parseUpstream(
      serverSubcategoryRowListSchema,
      await serverApi(event, '/api/admin/subcategories', {
        query: { ...list, ...(category ? { category } : {}) },
      }),
      'GET /admin/subcategories',
    )
    return { items: data.subcategories, pagination: data.pagination }
  } catch (error) {
    toBffError(error)
  }
})
