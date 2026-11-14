import { updateLumiTaskInputSchema } from '#shared/schemas/lumi-automation'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** PATCH /api/admin/lumi/automation/tasks/:id (Server: lumi.use). Título, descripción u hora diaria. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, updateLumiTaskInputSchema)
  try {
    await serverApi(event, `/api/admin/lumi/automation/tasks/${id}`, { method: 'PATCH', body: input })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
