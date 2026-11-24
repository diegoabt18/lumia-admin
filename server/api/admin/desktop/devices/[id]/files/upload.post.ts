import { Readable } from 'node:stream'
import {
  desktopDeviceIdSchema,
  desktopFileUploadQuerySchema,
  desktopUploadResultSchema,
  type DesktopUploadResult,
} from '#shared/schemas/desktop'
import { desktopBinary, desktopError, parseDesktop } from '../../../../../../utils/desktop'
import { readQueryOrThrow, readValidatedParam } from '../../../../../../utils/request-input'
import { serverApi } from '../../../../../../utils/server-api'
import { throwBffError } from '../../../../../../utils/upstream'

/**
 * POST /api/admin/desktop/devices/:id/files/upload?root&dir&name&size&sha256
 * (Server: desktop.files.write). El cuerpo es el archivo (`application/octet-stream`, tamaño y
 * tope comprobados en request-guard). Se retransmite en streaming, sin guardarlo. El SHA-256 lo
 * calcula el navegador; el Server y el agente lo vuelven a comprobar, y el agente nunca reemplaza
 * un archivo existente.
 */
export default defineEventHandler(async (event): Promise<DesktopUploadResult> => {
  const id = readValidatedParam(event, 'id', desktopDeviceIdSchema)
  const query = readQueryOrThrow(event, desktopFileUploadQuerySchema)
  if (Number(getHeader(event, 'content-length')) !== query.size) {
    throwBffError(400, { code: 'SIZE_MISMATCH', message: 'El tamaño del archivo no coincide.' })
  }
  // Con contrapresión: el BFF solo lee del navegador al ritmo al que el equipo acepta bloques, así
  // que nunca guarda el archivo entero en memoria (getRequestWebStream de h3 lo leería todo).
  const req = event.node.req
  const body = Readable.toWeb(req) as ReadableStream<Uint8Array>
  // Si el navegador cancela o se desconecta antes de enviar todo, se corta la llamada al Server:
  // el Server cancela la tarea y el equipo borra su archivo temporal.
  const clientGone = new AbortController()
  req.once('close', () => {
    if (!req.complete) clientGone.abort()
  })
  event.node.res.once('close', () => {
    if (!event.node.res.writableFinished) clientGone.abort()
  })

  try {
    // El cuerpo solo se puede enviar una vez: la sesión se renueva antes si hace falta.
    await serverApi(event, `/api/admin/desktop/devices/${id}`)
    const response = await desktopBinary(event, `/api/admin/desktop/devices/${id}/files/upload`, {
      method: 'POST',
      query: { root: query.root, dir: query.dir, name: query.name, size: query.size, sha256: query.sha256 },
      accept: 'application/json',
      stream: body,
      signal: clientGone.signal,
      // Toda la transferencia (hasta 100 MB): el Server responde al terminar.
      timeoutMs: 16 * 60_000,
    })
    const data: unknown = await response.json().catch(() => null)
    return parseDesktop(desktopUploadResultSchema, data, 'POST /admin/desktop/devices/:id/files/upload')
  } catch (error) {
    desktopError(error, 'No se encontró la carpeta de destino.')
  }
})
