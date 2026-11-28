import { lumiMemoryCreateSchema, lumiMemorySchema, type LumiMemory } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/lumi/memory (Server: `POST /api/lumi/memory`). Recuerdo añadido desde el panel. */
export default defineEventHandler(async (event): Promise<LumiMemory> => {
  const input = await readValidatedJson(event, lumiMemoryCreateSchema)
  try {
    const data = await serverApi(event, '/api/lumi/memory', { method: 'POST', body: input })
    return parseUpstream(lumiMemorySchema, data, 'POST /lumi/memory')
  } catch (error) {
    toBffError(error)
  }
})
