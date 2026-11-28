import { lumiMobileDeviceIdSchema } from '#shared/schemas/lumi'
import { readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/**
 * DELETE /api/admin/lumi/mobile-devices/:id (Server: `DELETE /api/lumichat/devices/:id`).
 * Deja de enviar avisos de pedidos a ese teléfono; no cierra su sesión. Solo dispositivos propios.
 */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', lumiMobileDeviceIdSchema)
  try {
    await serverApi(event, `/api/lumichat/devices/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
