import { lumiNotificationPreferencesSchema, type LumiNotificationPreferences } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * PUT /api/admin/lumi/notification-preferences (Server: `PUT /api/lumi/notifications/preferences`).
 * Solo las del usuario de la sesión: el cuerpo no admite otros campos.
 */
export default defineEventHandler(async (event): Promise<LumiNotificationPreferences> => {
  const input = await readValidatedJson(event, lumiNotificationPreferencesSchema)
  try {
    const data = await serverApi(event, '/api/lumi/notifications/preferences', { method: 'PUT', body: input })
    return parseUpstream(lumiNotificationPreferencesSchema, data, 'PUT /lumi/notifications/preferences')
  } catch (error) {
    toBffError(error)
  }
})
