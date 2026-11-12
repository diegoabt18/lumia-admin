import { serverCategoryDetailSchema, type CategoryDetail } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/categories/:id (Server: categories.read). Categoría + todas sus subcategorías. */
export default defineEventHandler(async (event): Promise<CategoryDetail> => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      serverCategoryDetailSchema,
      await serverApi(event, `/api/admin/categories/${id}`),
      'GET /admin/categories/:id',
    )
  } catch (error) {
    toBffError(error)
  }
})
