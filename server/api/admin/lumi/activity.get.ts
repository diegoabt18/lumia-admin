import { lumiActivitySchema, type LumiActivity } from '#shared/schemas/lumi'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

/** GET /api/admin/lumi/activity (Server: `GET /api/lumi/activity`, admin.access + lumi.use). */
export default defineEventHandler(async (event): Promise<LumiActivity> => {
  let data: unknown
  try {
    data = await serverApi(event, '/api/lumi/activity')
  } catch (error) {
    toBffError(error)
  }
  const parsed = lumiActivitySchema.safeParse(data)
  if (!parsed.success) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }
  return parsed.data
})
