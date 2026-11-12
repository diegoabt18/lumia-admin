import { z } from 'zod'
import { OBJECT_ID_PATTERN } from '#shared/schemas/common'
import { lumiProductAssistInputSchema, lumiProductAssistResponseSchema } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/lumi/products/:id/assist (Server: lumi.use + products.read).
 * Devuelve una sugerencia. No modifica el producto: eso lo hace el formulario al guardar.
 */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', z.string().regex(OBJECT_ID_PATTERN))
  const input = await readValidatedJson(event, lumiProductAssistInputSchema)
  try {
    return parseUpstream(
      lumiProductAssistResponseSchema,
      await serverApi(event, `/api/admin/lumi/products/${id}/assist`, { method: 'POST', body: input }),
      'POST /admin/lumi/products/:id/assist',
    )
  } catch (error) {
    toBffError(error)
  }
})
