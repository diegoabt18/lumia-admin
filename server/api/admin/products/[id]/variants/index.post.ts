import { variantCreateBodySchema } from '#shared/schemas/variants'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/products/:id/variants (Server: products.update; 409 si el SKU o el código de barras existen).
 * La moneda la fija el BFF con la moneda de la tienda (NUXT_PUBLIC_STORE_CURRENCY): no la elige el navegador.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, variantCreateBodySchema)
  const currency = String(useRuntimeConfig().public.storeCurrency || 'COP')
  try {
    await serverApi(event, `/api/admin/products/${id}/variants`, {
      method: 'POST',
      body: { ...input, currency },
    })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
