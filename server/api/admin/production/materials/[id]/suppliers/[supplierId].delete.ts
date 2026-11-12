import { serverMaterialLinksSchema } from '#shared/schemas/production'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** DELETE /api/admin/production/materials/:id/suppliers/:supplierId (Server: materials.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const supplierId = readObjectIdParam(event, 'supplierId')
  try {
    const links = parseUpstream(
      serverMaterialLinksSchema,
      await serverApi(event, `/api/admin/production/materials/${id}/suppliers/${supplierId}`, { method: 'DELETE' }),
      'DELETE /admin/production/materials/:id/suppliers/:supplierId',
    ).data.suppliers
    return { suppliers: links }
  } catch (error) {
    toBffError(error)
  }
})
