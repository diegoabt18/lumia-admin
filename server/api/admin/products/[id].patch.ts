import { productPatchBodySchema, serverProductMutationSchema } from '#shared/schemas/products'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/products/:id (Server: products.update).
 * No acepta `slug` (strict): cambiarlo dejaría variantes e inventario huérfanos en el Server.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, productPatchBodySchema)
  try {
    parseUpstream(
      serverProductMutationSchema,
      await serverApi(event, `/api/admin/products/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/products/:id',
    )
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
