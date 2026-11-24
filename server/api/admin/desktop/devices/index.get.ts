import { desktopDeviceListSchema, type DesktopDeviceListResponse } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../utils/desktop'
import { serverApi } from '../../../../utils/server-api'
import { UpstreamError } from '../../../../utils/upstream'

/**
 * GET /api/admin/desktop/devices (Server: desktop.devices.read). Solo los equipos propios.
 * Sin DESKTOP_AGENT_ENABLED el Server no registra la ruta (404): se informa como desactivado.
 */
export default defineEventHandler(async (event): Promise<DesktopDeviceListResponse> => {
  try {
    const data = parseDesktop(desktopDeviceListSchema, await serverApi(event, '/api/admin/desktop/devices'), 'GET /admin/desktop/devices')
    return { enabled: true, items: data.items }
  } catch (error) {
    if (error instanceof UpstreamError && error.statusCode === 404) return { enabled: false, items: [] }
    desktopError(error)
  }
})
