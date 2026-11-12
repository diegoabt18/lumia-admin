import { categoryPatchSchema, serverCategoryMutationSchema } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/categories/:id (Server: categories.update).
 * Ojo: el Server NO actualiza `category_slug` de los productos al cambiar el slug;
 * la interfaz solo permite cambiar el slug de categorías sin productos.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, categoryPatchSchema)
  try {
    parseUpstream(
      serverCategoryMutationSchema,
      await serverApi(event, `/api/admin/categories/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/categories/:id',
    )
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
