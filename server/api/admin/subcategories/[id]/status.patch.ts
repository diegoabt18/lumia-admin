import { categoryStatusBodySchema, serverSubcategoryMutationSchema } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/subcategories/:id/status (Server: categories.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, categoryStatusBodySchema)
  try {
    parseUpstream(
      serverSubcategoryMutationSchema,
      await serverApi(event, `/api/admin/subcategories/${id}/status`, { method: 'PATCH', body: input }),
      'PATCH /admin/subcategories/:id/status',
    )
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
