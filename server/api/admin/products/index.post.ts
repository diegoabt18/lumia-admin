import { productCreateBodySchema, serverProductMutationSchema } from '#shared/schemas/products'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/products (Server: products.create; valida que la categoría exista; 409 si el slug existe). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, productCreateBodySchema)
  try {
    const data = parseUpstream(
      serverProductMutationSchema,
      await serverApi(event, '/api/admin/products', { method: 'POST', body: input }),
      'POST /admin/products',
    )
    return { id: data.product.id }
  } catch (error) {
    toBffError(error)
  }
})
