import type { MaterialDetail, PriceEntry } from '#shared/schemas/production'
import { loadMaterialDetail } from '../../../../utils/production'
import { readObjectIdParam } from '../../../../utils/request-input'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/materials/:id (Server: materials.read): ficha, proveedores e historial de precios. */
export default defineEventHandler(async (event): Promise<{ material: MaterialDetail; prices: PriceEntry[] }> => {
  const id = readObjectIdParam(event)
  try {
    const { detail, prices } = await loadMaterialDetail(event, id)
    return { material: detail, prices }
  } catch (error) {
    toBffError(error)
  }
})
