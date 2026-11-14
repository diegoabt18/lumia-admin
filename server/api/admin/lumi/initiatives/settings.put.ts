import { initiativeSettingsInputSchema } from '#shared/schemas/lumi-initiatives'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PUT /api/admin/lumi/initiatives/settings (Server: lumi.use). Cambia el nivel de iniciativas. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, initiativeSettingsInputSchema)
  try {
    await serverApi(event, '/api/admin/lumi/initiatives/settings', { method: 'PUT', body: input })
    return { ok: true, level: input.level }
  } catch (error) {
    toBffError(error)
  }
})
