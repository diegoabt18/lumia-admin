import { serverProductDetailSchema, type ProductDetail } from '#shared/schemas/products'
import { toProductDetail } from '../../../utils/products'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/products/:id (Server: products.read) — producto + variantes con stock. */
export default defineEventHandler(async (event): Promise<ProductDetail> => {
  const id = readObjectIdParam(event)
  try {
    const data = parseUpstream(
      serverProductDetailSchema,
      await serverApi(event, `/api/admin/products/${id}`),
      'GET /admin/products/:id',
    )
    return toProductDetail(data)
  } catch (error) {
    toBffError(error)
  }
})
