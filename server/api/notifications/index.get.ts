import { notificationListQuerySchema, notificationListResponseSchema } from '#shared/schemas/notifications'
import { parseUpstream, readQueryOrThrow } from '../../utils/request-input'
import { serverApi } from '../../utils/server-api'
import { toBffError } from '../../utils/upstream'

/** GET /api/notifications (Server: sesión activa). Notificaciones del propio usuario. */
export default defineEventHandler(async (event) => {
  const query = readQueryOrThrow(event, notificationListQuerySchema)
  try {
    return parseUpstream(
      notificationListResponseSchema,
      await serverApi(event, '/api/notifications', { query }),
      'GET /notifications',
    )
  } catch (error) {
    toBffError(error)
  }
})
