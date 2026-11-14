import { initiativeSettingsResponseSchema } from '#shared/schemas/lumi-initiatives'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/initiatives/settings (Server: lumi.use). Nivel de iniciativas del usuario. */
export default defineEventHandler(async (event) => {
  try {
    return parseUpstream(
      initiativeSettingsResponseSchema,
      await serverApi(event, '/api/admin/lumi/initiatives/settings'),
      'GET /admin/lumi/initiatives/settings',
    )
  } catch (error) {
    toBffError(error)
  }
})
