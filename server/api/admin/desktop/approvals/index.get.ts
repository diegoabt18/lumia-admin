import { desktopApprovalListSchema, type DesktopApproval } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../utils/desktop'
import { serverApi } from '../../../../utils/server-api'
import { UpstreamError } from '../../../../utils/upstream'

/** GET /api/admin/desktop/approvals (Server: desktop.devices.read). Aprobaciones propias de Lumi Chat. */
export default defineEventHandler(async (event): Promise<{ items: DesktopApproval[] }> => {
  try {
    return parseDesktop(desktopApprovalListSchema, await serverApi(event, '/api/admin/desktop/approvals'), 'GET /admin/desktop/approvals')
  } catch (error) {
    // Agente desactivado en el Server: no hay aprobaciones.
    if (error instanceof UpstreamError && error.statusCode === 404) return { items: [] }
    desktopError(error)
  }
})
