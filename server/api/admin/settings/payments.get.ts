import { serverApi } from '../../../utils/server-api'
import { toPaymentView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/store-payment-settings (Server: admin.access). */
export default defineEventHandler(async (event) => {
  try {
    return toPaymentView(await serverApi(event, '/api/admin/store-payment-settings'))
  } catch (error) {
    toBffError(error)
  }
})
