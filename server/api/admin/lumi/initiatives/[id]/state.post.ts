import { changeInitiativeStateInputSchema, initiativeSchema } from '#shared/schemas/lumi-initiatives'
import { parseUpstream, readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/** POST /api/admin/lumi/initiatives/:id/state (Server: lumi.use). Transición validada por el Server. */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, changeInitiativeStateInputSchema)
  try {
    return parseUpstream(
      initiativeSchema,
      await serverApi(event, `/api/admin/lumi/initiatives/${id}/state`, { method: 'POST', body: input }),
      'POST /admin/lumi/initiatives/:id/state',
    )
  } catch (error) {
    toBffError(error)
  }
})
