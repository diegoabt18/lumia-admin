import { materialSupplierLinkBodySchema, serverMaterialLinksSchema, serverSupplierEnvelopeSchema } from '#shared/schemas/production'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/**
 * POST /api/admin/production/materials/:id/suppliers (Server: materials.update).
 * Solo proveedores activos. Si se marca como preferido, los demás dejan de serlo (el Server permite varios).
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, materialSupplierLinkBodySchema)
  try {
    const supplier = parseUpstream(
      serverSupplierEnvelopeSchema,
      await serverApi(event, `/api/admin/production/suppliers/${input.supplierId}`),
      'GET /admin/production/suppliers/:id',
    ).data
    if (!supplier.active) {
      throwBffError(409, { code: 'SUPPLIER_INACTIVE', message: 'El proveedor está inactivo.' })
    }
    let links = parseUpstream(
      serverMaterialLinksSchema,
      await serverApi(event, `/api/admin/production/materials/${id}/suppliers`, {
        method: 'POST',
        body: { supplierId: input.supplierId, isPreferred: input.isPreferred === true },
      }),
      'POST /admin/production/materials/:id/suppliers',
    ).data.suppliers
    if (input.isPreferred) {
      for (const other of links.filter((l) => l.isPreferred && l.supplierId !== input.supplierId)) {
        links = parseUpstream(
          serverMaterialLinksSchema,
          await serverApi(event, `/api/admin/production/materials/${id}/suppliers`, {
            method: 'POST',
            body: { supplierId: other.supplierId, isPreferred: false },
          }),
          'POST /admin/production/materials/:id/suppliers',
        ).data.suppliers
      }
    }
    return { suppliers: links }
  } catch (error) {
    toBffError(error)
  }
})
