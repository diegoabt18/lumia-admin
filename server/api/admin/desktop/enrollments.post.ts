import { desktopEnrollmentSchema, type DesktopEnrollment } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../utils/desktop'
import { serverApi } from '../../../utils/server-api'

/**
 * POST /api/admin/desktop/enrollments (Server: desktop.devices.manage). Código de un solo uso
 * (10 min). El equipo inscrito con él queda a nombre de quien lo genera.
 */
export default defineEventHandler(async (event): Promise<DesktopEnrollment> => {
  try {
    const data = await serverApi(event, '/api/admin/desktop/enrollments', { method: 'POST', body: {} })
    return parseDesktop(desktopEnrollmentSchema, data, 'POST /admin/desktop/enrollments')
  } catch (error) {
    desktopError(error, 'El agente de escritorio no está activado en el servidor.')
  }
})
