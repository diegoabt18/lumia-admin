import { serverApi } from '../../../utils/server-api'
import { toCustomerView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/store-customer-settings (Server: store.settings.read). */
export default defineEventHandler(async (event) => {
  try {
    return toCustomerView(await serverApi(event, '/api/admin/store-customer-settings'))
  } catch (error) {
    toBffError(error)
  }
})
