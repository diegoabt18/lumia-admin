import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** DELETE /api/admin/production/materials/:id (Server: materials.delete; rechaza 409 si alguna receta lo usa). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/production/materials/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
