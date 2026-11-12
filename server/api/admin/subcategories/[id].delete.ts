import { readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** DELETE /api/admin/subcategories/:id (Server: categories.delete; 409 si tiene productos asignados). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/subcategories/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
