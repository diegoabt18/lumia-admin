import { lumiHealthSchema, type LumiHealthComponent } from '#shared/schemas/lumi'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

/** GET /api/admin/lumi/health (Server: `GET /api/lumi/health`, admin.access + lumi.use). */
export default defineEventHandler(async (event): Promise<{ components: LumiHealthComponent[] }> => {
  let data: unknown
  try {
    data = await serverApi(event, '/api/lumi/health')
  } catch (error) {
    toBffError(error)
  }
  const parsed = lumiHealthSchema.safeParse(data)
  if (!parsed.success) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }
  return { components: parsed.data.components }
})
