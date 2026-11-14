import { lumiTaskActionSchema } from '#shared/schemas/lumi-automation'
import { readObjectIdParam, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/** POST /api/admin/lumi/automation/tasks/:id/(pause|resume) (Server: lumi.use). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const action = readValidatedParam(event, 'action', lumiTaskActionSchema)
  try {
    await serverApi(event, `/api/admin/lumi/automation/tasks/${id}/${action}`, { method: 'POST' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
