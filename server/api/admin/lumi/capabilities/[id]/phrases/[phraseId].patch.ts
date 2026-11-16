import { phraseResponseSchema, updatePhraseInputSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/** PATCH /api/admin/lumi/capabilities/:id/phrases/:phraseId (Server: lumi.capabilities.manage). */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const phraseId = readObjectIdParam(event, 'phraseId')
  const input = await readValidatedJson(event, updatePhraseInputSchema)
  try {
    return parseUpstream(
      phraseResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/phrases/${phraseId}`, { method: 'PATCH', body: input }),
      'PATCH /admin/lumi/capabilities/:id/phrases/:phraseId',
    )
  } catch (error) {
    toBffError(error)
  }
})
