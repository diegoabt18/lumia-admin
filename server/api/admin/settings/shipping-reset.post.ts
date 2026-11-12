import { serverApi } from '../../../utils/server-api'
import { toShippingView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'

/** POST /api/admin/store-shipping-settings/reset → valores por defecto del Server (admin.access). */
export default defineEventHandler(async (event) => {
  try {
    return toShippingView(await serverApi(event, '/api/admin/store-shipping-settings/reset', { method: 'POST' }))
  } catch (error) {
    toBffError(error)
  }
})
