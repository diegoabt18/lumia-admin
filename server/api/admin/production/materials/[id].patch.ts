import { materialPatchBodySchema, type MaterialDetail, type PriceEntry } from '#shared/schemas/production'
import { assertUniqueMaterialName, loadMaterialDetail } from '../../../../utils/production'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * PATCH /api/admin/production/materials/:id (Server: materials.update).
 * - La unidad de compra no cambia si el material ya tiene costo o precios: el costo guardado es
 *   "$ por unidad de compra" y el Server no lo convierte.
 * - Nombre único sin distinguir mayúsculas (el Server no lo comprueba al editar).
 */
export default defineEventHandler(async (event): Promise<{ material: MaterialDetail; prices: PriceEntry[] }> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, materialPatchBodySchema)
  try {
    const { detail } = await loadMaterialDetail(event, id)
    if (input.purchaseUnit !== undefined && input.purchaseUnit !== detail.purchaseUnit && (detail.hasPriceHistory || detail.lastCost > 0)) {
      throwBffError(409, {
        code: 'PURCHASE_UNIT_LOCKED',
        message: 'La unidad de compra no se puede cambiar: el material ya tiene costo registrado en esa unidad.',
        fieldErrors: { purchaseUnit: ['Fija: ya hay precios registrados en esta unidad.'] },
      })
    }
    if (input.name !== undefined && input.name.trim().toLocaleLowerCase('es') !== detail.name.trim().toLocaleLowerCase('es')) {
      await assertUniqueMaterialName(event, input.name, id)
    }
    await serverApi(event, `/api/admin/production/materials/${id}`, { method: 'PATCH', body: input })
    const { detail: material, prices } = await loadMaterialDetail(event, id)
    return { material, prices }
  } catch (error) {
    toBffError(error)
  }
})
