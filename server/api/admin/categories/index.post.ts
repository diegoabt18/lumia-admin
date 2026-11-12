import { categoryInputSchema, serverCategoryMutationSchema } from '#shared/schemas/categories'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/categories (Server: categories.create; 409 si el slug existe). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, categoryInputSchema)
  try {
    const data = parseUpstream(
      serverCategoryMutationSchema,
      await serverApi(event, '/api/admin/categories', { method: 'POST', body: input }),
      'POST /admin/categories',
    )
    return { id: data.category.id }
  } catch (error) {
    toBffError(error)
  }
})
