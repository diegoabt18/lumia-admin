import { lumiMobileDeviceListSchema, type LumiMobileDevice } from '#shared/schemas/lumi'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/**
 * GET /api/admin/lumi/mobile-devices (Server: `GET /api/lumichat/devices`, admin.access + lumi.use).
 * Solo los teléfonos del usuario de la sesión. `receivesPush`: activo y con la sesión viva.
 */
export default defineEventHandler(async (event): Promise<{ items: LumiMobileDevice[] }> => {
  let data: unknown
  try {
    data = await serverApi(event, '/api/lumichat/devices')
  } catch (error) {
    toBffError(error)
  }
  const parsed = lumiMobileDeviceListSchema.safeParse(data)
  if (!parsed.success) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }
  return { items: parsed.data.items }
})
