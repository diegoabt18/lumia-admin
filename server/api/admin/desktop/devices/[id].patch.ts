import { desktopDeviceIdSchema, desktopDeviceSchema, desktopRenameInputSchema, type DesktopDevice } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../utils/desktop'
import { readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { readValidatedJson } from '../../../../utils/validation'

/** PATCH /api/admin/desktop/devices/:id (Server: desktop.devices.manage). Solo el nombre. */
export default defineEventHandler(async (event): Promise<DesktopDevice> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  const input = await readValidatedJson(event, desktopRenameInputSchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/devices/${id}`, { method: 'PATCH', body: { name: input.name } })
    return parseDesktop(desktopDeviceSchema, data, 'PATCH /admin/desktop/devices/:id')
  } catch (error) {
    desktopError(error)
  }
})
