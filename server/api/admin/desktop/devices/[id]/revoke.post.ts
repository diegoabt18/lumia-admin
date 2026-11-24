import { desktopDeviceIdSchema, desktopDeviceSchema, type DesktopDevice } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../../utils/desktop'
import { readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'

/**
 * POST /api/admin/desktop/devices/:id/revoke (Server: desktop.devices.manage). Desconecta el
 * agente, invalida su identidad y borra sus aprobaciones de Lumi Chat. No se puede deshacer.
 */
export default defineEventHandler(async (event): Promise<DesktopDevice> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/devices/${id}/revoke`, { method: 'POST', body: {} })
    return parseDesktop(desktopDeviceSchema, data, 'POST /admin/desktop/devices/:id/revoke')
  } catch (error) {
    desktopError(error)
  }
})
