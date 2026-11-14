import { markNotificationsReadInputSchema, markNotificationsReadResponseSchema } from '#shared/schemas/notifications'
import { parseUpstream } from '../../utils/request-input'
import { serverApi } from '../../utils/server-api'
import { toBffError } from '../../utils/upstream'
import { readValidatedJson } from '../../utils/validation'

/** PATCH /api/notifications/read (Server: sesión activa). Marca como leídas las indicadas. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, markNotificationsReadInputSchema)
  try {
    return parseUpstream(
      markNotificationsReadResponseSchema,
      await serverApi(event, '/api/notifications/read', { method: 'PATCH', body: input }),
      'PATCH /notifications/read',
    )
  } catch (error) {
    toBffError(error)
  }
})
