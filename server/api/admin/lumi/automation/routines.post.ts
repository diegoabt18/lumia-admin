import { createLumiRoutineInputSchema } from '#shared/schemas/lumi-automation'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/lumi/automation/routines (Server: lumi.use). Rutina diaria con segundo aviso opcional. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, createLumiRoutineInputSchema)
  try {
    await serverApi(event, '/api/admin/lumi/automation/routines', { method: 'POST', body: input })
    return { ok: true }
  } catch (error) {
    toBffError(error)
  }
})
