import { lumiMemoryCorrectSchema, lumiMemoryIdSchema, lumiMemorySchema, type LumiMemory } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** PUT /api/admin/lumi/memory/:id (Server: `PUT /api/lumi/memory/:id`). Corrige: crea una versión nueva. */
export default defineEventHandler(async (event): Promise<LumiMemory> => {
  const id = readValidatedParam(event, 'id', lumiMemoryIdSchema)
  const input = await readValidatedJson(event, lumiMemoryCorrectSchema)
  try {
    const data = await serverApi(event, `/api/lumi/memory/${id}`, { method: 'PUT', body: input })
    return parseUpstream(lumiMemorySchema, data, 'PUT /lumi/memory/:id')
  } catch (error) {
    toBffError(error)
  }
})
