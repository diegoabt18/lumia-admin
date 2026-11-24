import { desktopApprovalIdSchema } from '#shared/schemas/desktop'
import { desktopError } from '../../../../utils/desktop'
import { readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'

/**
 * DELETE /api/admin/desktop/approvals/:id (Server: desktop.devices.read; solo las propias). Solo
 * restringe: Lumi vuelve a pedir confirmación para ese tipo de acción y destino.
 */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', desktopApprovalIdSchema)
  try {
    await serverApi(event, `/api/admin/desktop/approvals/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    desktopError(error, 'Esa aprobación ya no existe.')
  }
})
