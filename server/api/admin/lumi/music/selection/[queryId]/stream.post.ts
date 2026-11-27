import { z } from 'zod'
import { lumiMusicSelectionInputSchema } from '#shared/schemas/lumi'
import { serverStream } from '../../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../../utils/validation'

const paramsSchema = z.object({ queryId: z.string().uuid() })

/**
 * POST /api/admin/lumi/music/selection/:queryId/stream (Server: lumi.use). Reenvía el SSE del Server:
 * `music_playback` por cada estado verificado de la reproducción y `music_playback_result` al final.
 * Cerrar la pestaña no detiene la música: el Server deja terminar la reproducción en el equipo.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ queryId: getRouterParam(event, 'queryId') })
  if (!params.success) throw createError({ statusCode: 400, message: 'Búsqueda no válida' })
  const input = await readValidatedJson(event, lumiMusicSelectionInputSchema)

  let upstream: Response
  try {
    upstream = await serverStream(event, `/api/admin/lumi/music/selection/${params.data.queryId}/stream`, {
      method: 'POST',
      body: input,
    })
  } catch (error) {
    toBffError(error)
  }
  if (!upstream.body) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }

  const reader = upstream.body.getReader()
  event.node.res.once('close', () => {
    void reader.cancel().catch(() => undefined)
  })

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  })

  return sendStream(
    event,
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) controller.close()
        else controller.enqueue(value)
      },
      cancel() {
        return reader.cancel()
      },
    }),
  )
})
