import { serverSupplierEnvelopeSchema, supplierPatchBodySchema, toSupplierRow, type SupplierRow } from '#shared/schemas/production'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/production/suppliers/:id (Server: suppliers.update). '' vacía el campo. */
export default defineEventHandler(async (event): Promise<SupplierRow> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, supplierPatchBodySchema)
  try {
    const { data } = parseUpstream(
      serverSupplierEnvelopeSchema,
      await serverApi(event, `/api/admin/production/suppliers/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/production/suppliers/:id',
    )
    return toSupplierRow(data)
  } catch (error) {
    toBffError(error)
  }
})
