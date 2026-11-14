import { serverStream } from '../../utils/server-api'
import { throwBffError, toBffError } from '../../utils/upstream'

/**
 * GET /api/notifications/stream: reenvía el SSE de notificaciones del Server al navegador.
 * Al cerrarse la pestaña se libera la lectura del Server, que quita la suscripción en su hub.
 */
export default defineEventHandler(async (event) => {
  let upstream: Response
  try {
    upstream = await serverStream(event, '/api/notifications/stream', { method: 'GET' })
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
