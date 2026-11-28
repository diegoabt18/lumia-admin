import { lumiNotificationPreferencesSchema, type LumiNotificationPreferences } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/notification-preferences (Server: `GET /api/lumi/notifications/preferences`, lumi.use). */
export default defineEventHandler(async (event): Promise<LumiNotificationPreferences> => {
  try {
    const data = await serverApi(event, '/api/lumi/notifications/preferences')
    return parseUpstream(lumiNotificationPreferencesSchema, data, 'GET /lumi/notifications/preferences')
  } catch (error) {
    toBffError(error)
  }
})
