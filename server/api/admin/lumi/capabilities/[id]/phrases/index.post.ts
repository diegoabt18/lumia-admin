import { addPhraseInputSchema, phraseResponseSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/** POST /api/admin/lumi/capabilities/:id/phrases (Server: lumi.capabilities.manage). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, addPhraseInputSchema)
  try {
    const data = parseUpstream(
      phraseResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/phrases`, { method: 'POST', body: input }),
      'POST /admin/lumi/capabilities/:id/phrases',
    )
    setResponseStatus(event, 201)
    return data
  } catch (error) {
    toBffError(error)
  }
})
