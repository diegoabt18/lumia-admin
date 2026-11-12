import { serverProductDetailSchema } from '#shared/schemas/products'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

/**
 * DELETE /api/admin/products/:id (Server: products.delete).
 *
 * El Server borra solo el documento del producto: sus variantes e inventario quedarían
 * huérfanos (y visibles para el POS por SKU). Por eso el BFF lo rechaza si el producto
 * tiene variantes; para retirarlo de la venta se usa el estado "inactive".
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    const detail = parseUpstream(
      serverProductDetailSchema,
      await serverApi(event, `/api/admin/products/${id}`),
      'GET /admin/products/:id',
    )
    if (detail.variants.length > 0) {
      throwBffError(409, {
        code: 'PRODUCT_HAS_VARIANTS',
        message: 'El producto tiene variantes: desactívalo en lugar de eliminarlo.',
      })
    }
    await serverApi(event, `/api/admin/products/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
