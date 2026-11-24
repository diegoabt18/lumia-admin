import { desktopDeviceIdSchema, desktopFileDownloadQuerySchema, DESKTOP_MAX_FILE_BYTES } from '#shared/schemas/desktop'
import { desktopBinary, desktopError } from '../../../../../../utils/desktop'
import { readQueryOrThrow, readValidatedParam } from '../../../../../../utils/request-input'
import { throwBffError } from '../../../../../../utils/upstream'

/**
 * GET /api/admin/desktop/devices/:id/files/download?root&path (Server: desktop.files.read).
 * Retransmite el archivo tal como llega del Server, que a su vez lo pide al equipo por bloques y
 * comprueba su SHA-256. Si falla a mitad, la conexión se corta y el navegador marca la descarga
 * como incompleta. Solo se reenvían cabeceras conocidas y validadas.
 */
export default defineEventHandler(async (event) => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  const query = readQueryOrThrow(event, desktopFileDownloadQuerySchema)
  let upstream: Response
  try {
    upstream = await desktopBinary(event, `/api/admin/desktop/devices/${id}/files/download`, {
      method: 'GET',
      query: { root: query.root, path: query.path },
      accept: 'application/octet-stream',
      // Hasta las cabeceras: el equipo calcula antes el SHA-256 del archivo (hasta 100 MB).
      timeoutMs: 90_000,
    })
  } catch (error) {
    desktopError(error, 'No se encontró el archivo.')
  }

  const size = Number(upstream.headers.get('content-length'))
  const sha256 = upstream.headers.get('x-content-sha256') ?? ''
  const disposition = upstream.headers.get('content-disposition') ?? ''
  if (
    !upstream.body ||
    !Number.isInteger(size) ||
    size < 0 ||
    size > DESKTOP_MAX_FILE_BYTES ||
    !/^[a-f0-9]{64}$/.test(sha256) ||
    !/^attachment; filename="[\x20-\x7e]*"; filename\*=UTF-8''[\w%.!~*'()-]*$/.test(disposition)
  ) {
    await upstream.body?.cancel().catch(() => undefined)
    throwBffError(502, { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Respuesta inesperada del servidor de Lumia.' })
  }

  setResponseHeaders(event, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(size),
    'Content-Disposition': disposition,
    'X-Content-SHA256': sha256,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  })
  const reader = upstream.body.getReader()
  event.node.res.once('close', () => {
    void reader.cancel().catch(() => undefined)
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
