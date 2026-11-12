import { serverSubcategoryMutationSchema, subcategoryInputSchema } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/categories/:id/subcategories (Server: categories.create; 409 si el nombre o slug ya existen en la categoría). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, subcategoryInputSchema)
  try {
    const data = parseUpstream(
      serverSubcategoryMutationSchema,
      await serverApi(event, `/api/admin/categories/${id}/subcategories`, { method: 'POST', body: input }),
      'POST /admin/categories/:id/subcategories',
    )
    return { id: data.subcategory.id }
  } catch (error) {
    toBffError(error)
  }
})
