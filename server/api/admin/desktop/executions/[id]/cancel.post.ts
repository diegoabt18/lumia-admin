import { desktopExecutionIdSchema, desktopExecutionSchema, type DesktopExecution } from '#shared/schemas/desktop'
import { desktopError, parseDesktop } from '../../../../../utils/desktop'
import { readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'

/**
 * POST /api/admin/desktop/executions/:id/cancel (Server: admin.access + permiso de la operación;
 * solo quien la ordenó). Si ya terminó, el Server devuelve su estado final sin cambiarlo.
 */
export default defineEventHandler(async (event): Promise<DesktopExecution> => {
  const id = readValidatedParam(event, 'id', desktopExecutionIdSchema)
  try {
    const data = await serverApi(event, `/api/admin/desktop/executions/${id}/cancel`, { method: 'POST', body: {} })
    return parseDesktop(desktopExecutionSchema, data, 'POST /admin/desktop/executions/:id/cancel')
  } catch (error) {
    desktopError(error, 'No se encontró la ejecución.')
  }
})
