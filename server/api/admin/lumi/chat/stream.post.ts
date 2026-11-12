import { lumiChatInputSchema } from '#shared/schemas/lumi'
import { serverStream } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * POST /api/admin/lumi/chat/stream (Server: lumi.use). Reenvía el stream SSE del Server al
 * navegador. Si el navegador se desconecta, se libera la lectura del Server, que aborta la
 * llamada a ia-asistente y no guarda el turno.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, lumiChatInputSchema)

  let upstream: Response
  try {
    upstream = await serverStream(event, '/api/admin/lumi/chat/stream', { method: 'POST', body: input })
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
