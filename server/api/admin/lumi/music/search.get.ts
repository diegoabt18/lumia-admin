import { lumiMusicSearchQuerySchema, lumiMusicTracksResponseSchema } from '#shared/schemas/lumi-music'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/music/search?q= (Server: music.read). Busca en YouTube sin reproducir. */
export default defineEventHandler(async (event) => {
  const query = lumiMusicSearchQuerySchema.safeParse(getQuery(event))
  if (!query.success) throwBffError(422, { code: 'INVALID_INPUT', message: 'Escribe qué quieres buscar.' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return parseUpstream(
      lumiMusicTracksResponseSchema,
      await serverApi(event, '/api/admin/lumi/music/search', { query: { q: query.data.q, limit: 8 } }),
      'GET /admin/lumi/music/search',
    )
  } catch (error) {
    toBffError(error)
  }
})
