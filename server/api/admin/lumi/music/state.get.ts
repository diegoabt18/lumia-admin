import { lumiMusicStateResponseSchema } from '#shared/schemas/lumi-music'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/**
 * GET /api/admin/lumi/music/state (Server: music.read). Estado real del reproductor del servidor de
 * música. El navegador nunca habla con el asistente: siempre a través del Server, con la sesión.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return parseUpstream(
      lumiMusicStateResponseSchema,
      await serverApi(event, '/api/admin/lumi/music/state'),
      'GET /admin/lumi/music/state',
    )
  } catch (error) {
    toBffError(error)
  }
})
