import { serverApi } from '../../../utils/server-api'
import { toCurrencyView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/store-currency-settings (Server: admin.access). */
export default defineEventHandler(async (event) => {
  try {
    return toCurrencyView(await serverApi(event, '/api/admin/store-currency-settings'))
  } catch (error) {
    toBffError(error)
  }
})
