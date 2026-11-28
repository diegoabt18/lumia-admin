import { lumiMemoryListQuerySchema, lumiMemoryListSchema, type LumiMemory } from '#shared/schemas/lumi'
import { readQueryOrThrow } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/memory?status=active|all (Server: `GET /api/lumi/memory`). Solo los propios. */
export default defineEventHandler(async (event): Promise<{ items: LumiMemory[] }> => {
  const query = readQueryOrThrow(event, lumiMemoryListQuerySchema)
  let data: unknown
  try {
    data = await serverApi(event, '/api/lumi/memory', { query: { status: query.status } })
  } catch (error) {
    toBffError(error)
  }
  const parsed = lumiMemoryListSchema.safeParse(data)
  if (!parsed.success) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }
  return { items: parsed.data.items }
})
