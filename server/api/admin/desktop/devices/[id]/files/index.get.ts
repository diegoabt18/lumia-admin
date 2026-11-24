import {
  desktopDeviceIdSchema,
  desktopFileListQuerySchema,
  desktopFileListSchema,
  type DesktopFileList,
} from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../../../utils/desktop'
import { readQueryOrThrow, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'

/** GET /api/admin/desktop/devices/:id/files?root&path (Server: desktop.files.read). Hasta 500 entradas. */
export default defineEventHandler(async (event): Promise<DesktopFileList> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  const query = readQueryOrThrow(event, desktopFileListQuerySchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/devices/${id}/files`, {
      query: { root: query.root, path: query.path },
    })
    return parseDesktop(desktopFileListSchema, data, 'GET /admin/desktop/devices/:id/files')
  } catch (error) {
    desktopError(error, 'No se encontró la carpeta o el archivo.')
  }
})
