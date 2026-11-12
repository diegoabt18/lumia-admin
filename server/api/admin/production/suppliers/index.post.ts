import { serverSupplierEnvelopeSchema, supplierCreateBodySchema, toSupplierRow, type SupplierRow } from '#shared/schemas/production'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/production/suppliers (Server: suppliers.create). Los textos vacíos no se envían. */
export default defineEventHandler(async (event): Promise<SupplierRow> => {
  const input = await readValidatedJson(event, supplierCreateBodySchema)
  const body = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== ''))
  try {
    const { data } = parseUpstream(
      serverSupplierEnvelopeSchema,
      await serverApi(event, '/api/admin/production/suppliers', { method: 'POST', body }),
      'POST /admin/production/suppliers',
    )
    return toSupplierRow(data)
  } catch (error) {
    toBffError(error)
  }
})
