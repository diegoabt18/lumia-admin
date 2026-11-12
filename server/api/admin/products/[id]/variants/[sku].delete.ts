import { serverProductDetailSchema } from '#shared/schemas/products'
import { parseUpstream, readObjectIdParam, readSkuParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../utils/upstream'

/**
 * DELETE /api/admin/products/:id/variants/:sku (Server: products.update).
 * El Server borra la variante y su inventario sin mirar reservas: el BFF lo impide si hay
 * unidades reservadas por pedidos en curso.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const sku = readSkuParam(event)
  try {
    const detail = parseUpstream(
      serverProductDetailSchema,
      await serverApi(event, `/api/admin/products/${id}`),
      'GET /admin/products/:id',
    )
    const variant = detail.variants.find((v) => v.sku === sku)
    if (!variant) {
      throwBffError(404, { code: 'VARIANT_NOT_FOUND', message: 'La variante no pertenece a este producto.' })
    }
    if (variant.reserved > 0) {
      throwBffError(409, {
        code: 'VARIANT_HAS_RESERVATIONS',
        message: `La variante tiene ${variant.reserved} unidad(es) reservada(s) por pedidos en curso.`,
      })
    }
    await serverApi(event, `/api/admin/products/${id}/variants/${encodeURIComponent(sku)}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
