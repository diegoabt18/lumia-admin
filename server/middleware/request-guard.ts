import { IMAGE_MAX_REQUEST_BYTES } from '#shared/schemas/images'
import { throwBffError } from '../utils/upstream'

/**
 * Protección CSRF y de forma de las peticiones al BFF.
 *
 * - Cookies de sesión con SameSite=Strict (primera barrera).
 * - Toda petición que modifica estado debe traer un Origin permitido
 *   (mismo origen que sirve la app o NUXT_ALLOWED_ORIGINS).
 * - Los cuerpos deben ser JSON: evita formularios cross-site "simples" (text/plain, form-urlencoded).
 * - Límite de tamaño del cuerpo para peticiones JSON.
 * - Única excepción: las rutas de generación de imágenes aceptan multipart/form-data, con
 *   Content-Length obligatorio y un tope propio (el Origin se exige igual).
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const MAX_JSON_BODY_BYTES = 256 * 1024
const MULTIPART_ROUTES = new Set(['/api/admin/images/product', '/api/admin/images/site', '/api/admin/images/material'])

function allowedOrigins(selfOrigin: string): Set<string> {
  const config = useRuntimeConfig()
  const extra = String(config.allowedOrigins ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return new Set([selfOrigin, ...extra])
}

export default defineEventHandler((event) => {
  const path = event.path ?? ''
  if (!path.startsWith('/api/')) return
  if (SAFE_METHODS.has(event.method)) return

  // Origen propio: host con el que el navegador llegó (sin confiar en X-Forwarded-*).
  const self = getRequestURL(event)
  const selfOrigin = `${self.protocol}//${self.host}`
  const origin = getHeader(event, 'origin')?.replace(/\/+$/, '')

  if (!origin || !allowedOrigins(selfOrigin).has(origin)) {
    throwBffError(403, { code: 'FORBIDDEN_ORIGIN', message: 'Origen de la petición no permitido.' })
  }

  const contentLength = Number(getHeader(event, 'content-length') ?? '0')
  const hasBody = contentLength > 0 || Boolean(getHeader(event, 'transfer-encoding'))
  if (hasBody) {
    const contentType = (getHeader(event, 'content-type') ?? '').toLowerCase()
    const pathname = path.split('?')[0] ?? ''
    if (MULTIPART_ROUTES.has(pathname) && event.method === 'POST' && contentType.startsWith('multipart/form-data')) {
      if (!(contentLength > 0) || getHeader(event, 'transfer-encoding')) {
        throwBffError(411, { code: 'LENGTH_REQUIRED', message: 'Falta el tamaño de la solicitud.' })
      }
      if (contentLength > IMAGE_MAX_REQUEST_BYTES) {
        throwBffError(413, { code: 'PAYLOAD_TOO_LARGE', message: 'Las imágenes superan el tamaño máximo por envío (40 MB).' })
      }
      return
    }
    if (!contentType.startsWith('application/json')) {
      throwBffError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'El cuerpo debe ser JSON.' })
    }
    if (contentLength > MAX_JSON_BODY_BYTES) {
      throwBffError(413, { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud es demasiado grande.' })
    }
  }
})
