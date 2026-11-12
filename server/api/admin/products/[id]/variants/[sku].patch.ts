import { variantPatchBodySchema } from '#shared/schemas/variants'
import { readObjectIdParam, readSkuParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** PATCH /api/admin/products/:id/variants/:sku (Server: products.update). El SKU no es editable. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const sku = readSkuParam(event)
  const input = await readValidatedJson(event, variantPatchBodySchema)
  try {
    await serverApi(event, `/api/admin/products/${id}/variants/${encodeURIComponent(sku)}`, {
      method: 'PATCH',
      body: input,
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
