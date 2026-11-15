import { serverApi } from '../../../utils/server-api'
import { toShippingView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/store-shipping-settings (Server: store.settings.read). */
export default defineEventHandler(async (event) => {
  try {
    return toShippingView(await serverApi(event, '/api/admin/store-shipping-settings'))
  } catch (error) {
    toBffError(error)
  }
})
