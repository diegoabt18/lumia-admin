import { z } from 'zod'
import { lumiMusicPlaybackResultSchema, lumiMusicSelectionInputSchema } from '#shared/schemas/lumi'
import { parseUpstream } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

const paramsSchema = z.object({ queryId: z.string().uuid() })

/**
 * Vídeo elegido en la tarjeta de candidatos de Lumi (respuesta única, sin progreso). El Server valida
 * que la búsqueda sea del usuario y siga vigente, ordena la reproducción al equipo y responde con el
 * resultado que verificó el agente. El chat usa la variante en streaming (`/stream`).
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ queryId: getRouterParam(event, 'queryId') })
  if (!params.success) throw createError({ statusCode: 400, message: 'Búsqueda no válida' })
  const input = await readValidatedJson(event, lumiMusicSelectionInputSchema)

  try {
    return parseUpstream(
      lumiMusicPlaybackResultSchema,
      await serverApi(event, `/api/admin/lumi/music/selection/${params.data.queryId}`, {
        method: 'POST',
        body: input,
      }),
      'POST /admin/lumi/music/selection',
    )
  } catch (error) {
    toBffError(error)
  }
})
