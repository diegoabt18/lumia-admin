import { lumiMusicDiscoveryResponseSchema, lumiMusicRecommendationsQuerySchema } from '#shared/schemas/lumi-music'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/** GET /api/admin/lumi/music/recommendations?videoId= (Server: music.read). Descubrir música. */
export default defineEventHandler(async (event) => {
  const query = lumiMusicRecommendationsQuerySchema.safeParse(getQuery(event))
  if (!query.success) throwBffError(422, { code: 'INVALID_INPUT', message: 'Canción no válida.' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return parseUpstream(
      lumiMusicDiscoveryResponseSchema,
      await serverApi(event, '/api/admin/lumi/music/recommendations', {
        query: query.data.videoId ? { videoId: query.data.videoId } : {},
      }),
      'GET /admin/lumi/music/recommendations',
    )
  } catch (error) {
    toBffError(error)
  }
})
