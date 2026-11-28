import { lumiMemoryIdSchema, lumiMemoryListSchema, type LumiMemory } from '#shared/schemas/lumi'
import { parseUpstream, readValidatedParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'

/** GET /api/admin/lumi/memory/:id/history (Server: `GET /api/lumi/memory/:id/history`). */
export default defineEventHandler(async (event): Promise<{ items: LumiMemory[] }> => {
  const id = readValidatedParam(event, 'id', lumiMemoryIdSchema)
  try {
    const data = await serverApi(event, `/api/lumi/memory/${id}/history`)
    return parseUpstream(lumiMemoryListSchema, data, 'GET /lumi/memory/:id/history')
  } catch (error) {
    toBffError(error)
  }
})
