import type { H3Event } from 'h3'
import type { z } from 'zod'
import { clearAdminSession, readSessionTokens } from './admin-session'
import { parseUpstream } from './request-input'
import { ensureAdminAccess, refreshAdminSession } from './server-api'
import { rawServerBinary, throwBffError, toBffError, UpstreamError, type UpstreamRequest } from './upstream'

/**
 * Utilidades del BFF de Lumia Desktop Agent (Server: src/routes/lumi-desktop-agent.routes.ts).
 * Los mensajes del Server y del agente están en inglés y pueden nombrar detalles internos: aquí se
 * traducen los códigos conocidos y el resto pasa por toBffError (que ya oculta los 5xx).
 */

const KNOWN: Record<string, string> = {
  DEVICE_OFFLINE: 'El equipo no está conectado.',
  DEVICE_PAUSED: 'La ejecución está en pausa en el equipo.',
  DEVICE_REVOKED: 'El equipo está revocado.',
  OPERATION_NOT_SUPPORTED: 'El equipo no admite esta operación (actualiza Lumia Desktop Agent).',
  // Archivos (fase 6).
  PATH_NOT_ALLOWED: 'Esa carpeta ya no está autorizada en el equipo.',
  FILE_NOT_FOUND: 'El archivo o la carpeta ya no existe en el equipo.',
  FILE_TOO_LARGE: 'El archivo supera el máximo de 100 MB.',
  FILE_EXISTS: 'Ya existe un archivo con ese nombre en esa carpeta. Lumia nunca reemplaza archivos.',
  FILE_CHANGED: 'El archivo cambió mientras se enviaba. Vuelve a intentarlo.',
  INTEGRITY_FAILED: 'El archivo llegó dañado (el SHA-256 no coincide). No se guardó nada.',
  SIZE_MISMATCH: 'El tamaño del archivo no coincide.',
  TRANSFER_IDLE: 'El equipo dejó de responder durante la transferencia.',
  INVALID_ARGUMENTS: 'Nombre o ruta no válidos.',
  FILE_IO_ERROR: 'El equipo no pudo leer o escribir el archivo.',
  CANCELLED: 'La transferencia se canceló.',
}

export function desktopError(error: unknown, notFound = 'No se encontró el equipo.'): never {
  if (error instanceof UpstreamError) {
    const known = KNOWN[error.code]
    if (known) throwBffError(error.statusCode, { code: error.code, message: known, requestId: error.requestId })
    if (error.statusCode === 404) throwBffError(404, { code: 'NOT_FOUND', message: notFound, requestId: error.requestId })
    if (error.statusCode === 403) {
      throwBffError(403, { code: 'FORBIDDEN', message: 'No tienes permiso para esta acción.', requestId: error.requestId })
    }
  }
  toBffError(error)
}

/** Valida la respuesta del Server (502 si la forma no coincide). */
export function parseDesktop<T extends z.ZodTypeAny>(schema: T, data: unknown, context: string): z.infer<T> {
  return parseUpstream(schema, data, context)
}

/**
 * Llamada binaria con la sesión del admin. Sin cuerpo (descargas) se renueva la sesión y se
 * reintenta ante un 401, como serverApi. Con cuerpo (subidas) no hay reintento posible: el
 * manejador debe asegurar la sesión antes.
 */
export async function desktopBinary(
  event: H3Event,
  path: string,
  req: Omit<UpstreamRequest, 'credentials'> & {
    accept: string
    timeoutMs: number
    stream?: ReadableStream<Uint8Array>
    signal?: AbortSignal
  },
): Promise<Response> {
  await ensureAdminAccess(event)
  const call = () =>
    rawServerBinary(event, path, { ...req, credentials: { accessToken: readSessionTokens(event).accessToken } })
  try {
    return await call()
  } catch (error) {
    if (!(error instanceof UpstreamError) || error.statusCode !== 401) throw error
    if (req.stream || !(await refreshAdminSession(event))) {
      clearAdminSession(event)
      throwBffError(401, { code: 'SESSION_EXPIRED', message: 'Tu sesión expiró. Inicia sesión de nuevo.' })
    }
  }
  return call()
}
