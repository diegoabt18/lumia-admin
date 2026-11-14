import { unreadCountResponseSchema } from '#shared/schemas/notifications'
import { parseUpstream } from '../../utils/request-input'
import { serverApi } from '../../utils/server-api'
import { toBffError } from '../../utils/upstream'

/** GET /api/notifications/unread-count (Server: sesión activa). */
export default defineEventHandler(async (event) => {
  try {
    return parseUpstream(
      unreadCountResponseSchema,
      await serverApi(event, '/api/notifications/unread-count'),
      'GET /notifications/unread-count',
    )
  } catch (error) {
    toBffError(error)
  }
})
