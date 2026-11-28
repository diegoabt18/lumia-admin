import { lumiMemoryIdSchema, lumiMemorySchema, type LumiMemory } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** DELETE /api/admin/lumi/memory/:id (Server: `DELETE /api/lumi/memory/:id`). Olvida; queda constancia. */
export default defineEventHandler(async (event): Promise<LumiMemory> => {
  const id = readValidatedParam(event, 'id', lumiMemoryIdSchema)
  try {
    const data = await serverApi(event, `/api/lumi/memory/${id}`, { method: 'DELETE' })
    return parseUpstream(lumiMemorySchema, data, 'DELETE /lumi/memory/:id')
  } catch (error) {
    toBffError(error)
  }
})
