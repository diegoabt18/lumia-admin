import { shippingSettingsSchema } from '#shared/schemas/settings'
import { serverApi } from '../../../utils/server-api'
import { toShippingView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PUT /api/admin/store-shipping-settings (Server: admin.access; el Server no valida el cuerpo).
 * `calculationType` se fija en 'flat_rate', el único modo que implementan Server y tienda.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, shippingSettingsSchema)
  try {
    return toShippingView(
      await serverApi(event, '/api/admin/store-shipping-settings', {
        method: 'PUT',
        body: { ...input, calculationType: 'flat_rate' },
      }),
    )
  } catch (error) {
    toBffError(error)
  }
})
