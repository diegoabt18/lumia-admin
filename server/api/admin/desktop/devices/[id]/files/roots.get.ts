import { desktopDeviceIdSchema, desktopFileRootsSchema, type DesktopFileRoot } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../../../utils/desktop'
import { readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'

/**
 * GET /api/admin/desktop/devices/:id/files/roots (Server: desktop.files.read). Carpetas que el
 * usuario autorizó en el equipo: id y nombre de la carpeta, nunca su ruta completa.
 */
export default defineEventHandler(async (event): Promise<{ roots: DesktopFileRoot[] }> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/devices/${id}/files/roots`)
    return parseDesktop(desktopFileRootsSchema, data, 'GET /admin/desktop/devices/:id/files/roots')
  } catch (error) {
    desktopError(error)
  }
})
