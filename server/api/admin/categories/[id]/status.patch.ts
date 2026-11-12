import { categoryStatusBodySchema, serverCategoryMutationSchema } from '#shared/schemas/categories'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/categories/:id/status (Server: categories.update). Desactivar no borra historial. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, categoryStatusBodySchema)
  try {
    parseUpstream(
      serverCategoryMutationSchema,
      await serverApi(event, `/api/admin/categories/${id}/status`, { method: 'PATCH', body: input }),
      'PATCH /admin/categories/:id/status',
    )
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
