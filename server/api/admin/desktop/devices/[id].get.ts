import { desktopDeviceIdSchema, desktopDeviceSchema, type DesktopDevice } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../utils/desktop'
import { readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'

/** GET /api/admin/desktop/devices/:id (Server: desktop.devices.read). 404 si no es propio. */
export default defineEventHandler(async (event): Promise<DesktopDevice> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  try {
    return parseDesktop(desktopDeviceSchema, await serverApi(event, `/api/admin/desktop/devices/${id}`), 'GET /admin/desktop/devices/:id')
  } catch (error) {
    desktopError(error)
  }
})
