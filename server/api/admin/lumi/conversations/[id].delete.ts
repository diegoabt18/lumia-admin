import { lumiConversationIdSchema } from '#shared/schemas/lumi'
import { readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** DELETE /api/admin/lumi/conversations/:id (Server: lumi.use; solo borra conversaciones propias). */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', lumiConversationIdSchema)
  try {
    await serverApi(event, `/api/admin/lumi/conversations/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
