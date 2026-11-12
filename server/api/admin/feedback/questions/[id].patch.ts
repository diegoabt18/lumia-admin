import { feedbackVisibilitySchema } from '#shared/schemas/feedback'
import { readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/feedback/questions/:id (Server: admin.access). Solo `hidden`. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, feedbackVisibilitySchema)
  try {
    await serverApi(event, `/api/admin/feedback/questions/${id}`, { method: 'PATCH', body: { hidden: input.hidden } })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
