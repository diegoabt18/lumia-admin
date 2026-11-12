import { priceEntryBodySchema, type MaterialDetail, type PriceEntry } from '#shared/schemas/production'
import { loadMaterialDetail } from '../../../../../utils/production'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/production/materials/:id/prices (Server: materials.update → POST …/price-history).
 * - La unidad es siempre la unidad de compra del material (el costo se guarda como $ por esa unidad).
 * - El proveedor debe estar vinculado al material; su nombre se toma del vínculo.
 * El Server actualiza el costo del material y marca como desactualizadas las recetas que lo usan.
 */
export default defineEventHandler(async (event): Promise<{ material: MaterialDetail; prices: PriceEntry[] }> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, priceEntryBodySchema)
  try {
    const { detail } = await loadMaterialDetail(event, id)
    const body: Record<string, unknown> = {
      price: input.price,
      quantity: input.quantity,
      unit: detail.purchaseUnit,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
    }
    if (detail.purchaseUnit === 'rollo') {
      if (!input.rolloMeters) {
        throwBffError(422, { code: 'INVALID_INPUT', message: 'Indica los metros por rollo.', fieldErrors: { rolloMeters: ['Indica los metros por rollo.'] } })
      }
      body.rolloMeters = input.rolloMeters
    }
    if (input.supplierId) {
      const link = detail.suppliers.find((s) => s.supplierId === input.supplierId)
      if (!link) {
        throwBffError(422, { code: 'INVALID_INPUT', message: 'El proveedor no está vinculado a este material.', fieldErrors: { supplierId: ['Vincula primero el proveedor.'] } })
      }
      body.supplierId = link.supplierId
      if (link.supplierName) body.supplierName = link.supplierName.slice(0, 200)
    }
    await serverApi(event, `/api/admin/production/materials/${id}/price-history`, { method: 'POST', body })
    const { detail: material, prices } = await loadMaterialDetail(event, id)
    return { material, prices }
  } catch (error) {
    toBffError(error)
  }
})
