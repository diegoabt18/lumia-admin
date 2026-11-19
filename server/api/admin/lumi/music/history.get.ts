import { lumiMusicTracksResponseSchema } from '#shared/schemas/lumi-music'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/music/history (Server: music.read). Últimas canciones que sonaron. */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return parseUpstream(
      lumiMusicTracksResponseSchema,
      await serverApi(event, '/api/admin/lumi/music/history'),
      'GET /admin/lumi/music/history',
    )
  } catch (error) {
    toBffError(error)
  }
})
