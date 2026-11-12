import { serverSubcategoryMutationSchema, subcategoryPatchSchema } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** PATCH /api/admin/subcategories/:id (Server: categories.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, subcategoryPatchSchema)
  try {
    parseUpstream(
      serverSubcategoryMutationSchema,
      await serverApi(event, `/api/admin/subcategories/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/subcategories/:id',
    )
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
