import { currencySettingsSchema } from '#shared/schemas/settings'
import { serverApi } from '../../../utils/server-api'
import { toCurrencyView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/store-currency-settings (Server: admin.access; el Server no valida el cuerpo).
 * Solo formato de presentación: el esquema estricto no admite `code`, porque cambiarlo no
 * convierte los precios guardados en el catálogo ni en los pedidos.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, currencySettingsSchema)
  try {
    return toCurrencyView(await serverApi(event, '/api/admin/store-currency-settings', { method: 'PATCH', body: input }))
  } catch (error) {
    toBffError(error)
  }
})
