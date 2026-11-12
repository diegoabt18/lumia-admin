import { serverSubcategoryListSchema, type SubcategoryRow } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/categories/:id/subcategories (Server: categories.read). */
export default defineEventHandler(async (event): Promise<{ items: SubcategoryRow[] }> => {
  const id = readObjectIdParam(event)
  try {
    const data = parseUpstream(
      serverSubcategoryListSchema,
      await serverApi(event, `/api/admin/categories/${id}/subcategories`),
      'GET /admin/categories/:id/subcategories',
    )
    return { items: data.subcategories }
  } catch (error) {
    toBffError(error)
  }
})
