import { runResponseSchema, startRunInputSchema } from '#shared/schemas/lumi-capability-tests'
import { parseUpstream, readObjectIdParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

/**
 * POST /api/admin/lumi/capabilities/:id/test-runs (Server: lumi.capabilities.test).
 * La prueba corre en segundo plano en el Server (202); el panel consulta la ejecución.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, startRunInputSchema)
  try {
    const data = parseUpstream(
      runResponseSchema,
      await serverApi(event, `/api/admin/lumi/capabilities/${id}/test-runs`, { method: 'POST', body: input }),
      'POST /admin/lumi/capabilities/:id/test-runs',
    )
    setResponseStatus(event, 202)
    return data
  } catch (error) {
    toBffError(error)
  }
})
