import { reviewNotificationResponseSchema } from '#shared/schemas/notifications'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'

/**
 * POST /api/admin/lumi/automation/notifications/:id/review (Server: lumi.use).
 * "Marcar como revisado" desde una notificación del motor: confirma la revisión de la rutina.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    return parseUpstream(
      reviewNotificationResponseSchema,
      await serverApi(event, `/api/admin/lumi/automation/notifications/${id}/review`, { method: 'POST' }),
      'POST /admin/lumi/automation/notifications/:id/review',
    )
  } catch (error) {
    toBffError(error)
  }
})
