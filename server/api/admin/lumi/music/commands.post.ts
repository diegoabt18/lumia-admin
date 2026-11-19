import { lumiMusicCommandResponseSchema, lumiMusicCommandSchema } from '#shared/schemas/lumi-music'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * POST /api/admin/lumi/music/commands (Server: music.control). Botones del reproductor del chat.
 * Solo órdenes de una lista cerrada con argumentos tipados; el Server vuelve a validarlas y comprueba
 * el permiso antes de enviarlas al asistente.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, lumiMusicCommandSchema)
  try {
    return parseUpstream(
      lumiMusicCommandResponseSchema,
      await serverApi(event, '/api/admin/lumi/music/commands', { method: 'POST', body: input }),
      'POST /admin/lumi/music/commands',
    )
  } catch (error) {
    toBffError(error)
  }
})
