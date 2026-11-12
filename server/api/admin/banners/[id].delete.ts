import { readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** DELETE /api/admin/store-banners/:id (Server: products.update). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/store-banners/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
