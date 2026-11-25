import { z } from 'zod'
import { serverStream } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

const musicPlaySchema = z.object({
  query: z.string().min(1).max(500),
})

/**
 * POST /api/admin/lumi/music/play — Reenvía el stream SSE del Server para reproducir música
 * vía Desktop Agent en el navegador Brave.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, musicPlaySchema)

  let upstream: Response
  try {
    upstream = await serverStream(event, '/api/admin/lumi/music/play', { method: 'POST', body: input })
  } catch (error) {
    toBffError(error)
  }
  if (!upstream.body) {
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor.' })
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
