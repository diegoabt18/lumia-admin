import { desktopDeviceIdSchema, desktopExecutionListSchema, type DesktopExecution } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../../utils/desktop'
import { readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'

/** GET /api/admin/desktop/devices/:id/executions (Server: desktop.devices.read). Últimas 50, solo metadatos. */
export default defineEventHandler(async (event): Promise<{ items: DesktopExecution[] }> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/devices/${id}/executions`)
    return parseDesktop(desktopExecutionListSchema, data, 'GET /admin/desktop/devices/:id/executions')
  } catch (error) {
    desktopError(error)
  }
})
