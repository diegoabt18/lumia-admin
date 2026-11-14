import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** DELETE /api/admin/lumi/automation/tasks/:id (Server: lumi.use). Elimina la rutina y su segundo aviso. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/lumi/automation/tasks/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
