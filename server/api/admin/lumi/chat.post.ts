import { lumiChatInputSchema, lumiChatResponseSchema } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/lumi/chat (Server: lumi.use; el Server reenvía a ia-asistente). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, lumiChatInputSchema)
  try {
    return parseUpstream(
      lumiChatResponseSchema,
      await serverApi(event, '/api/admin/lumi/chat', { method: 'POST', body: input }),
      'POST /admin/lumi/chat',
    )
  } catch (error) {
    toBffError(error)
  }
})
