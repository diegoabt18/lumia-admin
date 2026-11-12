import { serverDepositPolicyHistorySchema } from '#shared/schemas/inventory'
import { parseUpstream, readSkuParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/inventory/:sku/deposit-policy/history (Server: products.read). */
export default defineEventHandler(async (event) => {
  const sku = readSkuParam(event)
  try {
    return parseUpstream(
      serverDepositPolicyHistorySchema,
      await serverApi(event, `/api/admin/inventory/${encodeURIComponent(sku)}/deposit-policy/history`),
      'GET /admin/inventory/:sku/deposit-policy/history',
    )
  } catch (error) {
    toBffError(error)
  }
})
