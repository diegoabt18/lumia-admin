import type { H3Event } from 'h3'
import {
  detectImageType,
  IMAGE_MAX_FILE_BYTES,
  IMAGE_MAX_REQUEST_BYTES,
  imageStudioConfigSchema,
  type ImageStudioConfig,
} from '#shared/schemas/images'
import { ensureAdminAccess } from './server-api'
import { throwBffError } from './upstream'

/** Tiempo máximo de la generación en el Server: AVIF es lento (hasta 90 variantes por envío). */
export const IMAGE_GENERATION_TIMEOUT_MS = 180_000

export interface ValidatedImage {
  field: string
  filename: string
  type: string
  data: Uint8Array<ArrayBuffer>
}

export interface ParsedImageUpload {
  fields: Record<string, string>
  files: ValidatedImage[]
  config: ImageStudioConfig | null
}

/**
 * Lee y valida el multipart del navegador. Nada se reenvía tal cual:
 * - solo campos y archivos esperados (`allowedFields`, `allowedFiles` con su máximo);
 * - cada archivo: tamaño ≤ 12 MB y tipo real por bytes (JPEG, PNG, WebP, AVIF, GIF, TIFF; nunca SVG);
 * - `config`: JSON validado con el esquema del estudio.
 * El Server vuelve a validar todo (tipo, dimensiones, slug).
 */
export async function readImageUpload(
  event: H3Event,
  spec: { allowedFields: readonly string[]; allowedFiles: Record<string, number> },
): Promise<ParsedImageUpload> {
  // Sin sesión no se lee el cuerpo: evita que una petición anónima haga cargar hasta 40 MB en memoria.
  await ensureAdminAccess(event)
  const parts = await readMultipartFormData(event)
  if (!parts?.length) throwBffError(400, { code: 'EMPTY_UPLOAD', message: 'No se recibió ninguna imagen.' })

  const fields: Record<string, string> = {}
  const files: ValidatedImage[] = []
  const counts: Record<string, number> = {}
  let total = 0

  for (const part of parts) {
    const name = part.name ?? ''
    if (part.filename !== undefined) {
      if (!(name in spec.allowedFiles)) {
        throwBffError(400, { code: 'UNEXPECTED_FILE', message: 'Archivo no esperado en la solicitud.' })
      }
      counts[name] = (counts[name] ?? 0) + 1
      if (counts[name]! > spec.allowedFiles[name]!) {
        throwBffError(400, { code: 'TOO_MANY_FILES', message: 'Se enviaron demasiadas imágenes.' })
      }
      const data = Uint8Array.from(part.data)
      total += data.byteLength
      if (data.byteLength === 0) throwBffError(400, { code: 'EMPTY_FILE', message: 'Una de las imágenes está vacía.' })
      if (data.byteLength > IMAGE_MAX_FILE_BYTES || total > IMAGE_MAX_REQUEST_BYTES) {
        throwBffError(413, { code: 'FILE_TOO_LARGE', message: 'Cada imagen puede pesar hasta 12 MB (40 MB por envío).' })
      }
      const type = detectImageType(data)
      if (!type) {
        throwBffError(415, {
          code: 'UNSUPPORTED_IMAGE',
          message: 'Formato no permitido. Usa JPEG, PNG, WebP, AVIF, GIF o TIFF (SVG no se acepta).',
        })
      }
      const filename = (part.filename || 'imagen').replace(/[^\w.-]+/g, '_').slice(0, 120)
      files.push({ field: name, filename, type, data })
    } else {
      if (!spec.allowedFields.includes(name)) {
        throwBffError(400, { code: 'UNEXPECTED_FIELD', message: 'Campo no esperado en la solicitud.' })
      }
      fields[name] = part.data.toString('utf8').slice(0, 4000)
    }
  }

  let config: ImageStudioConfig | null = null
  if (fields.config) {
    let raw: unknown
    try {
      raw = JSON.parse(fields.config)
    } catch {
      throwBffError(422, { code: 'INVALID_INPUT', message: 'La configuración no es válida.' })
    }
    const parsed = imageStudioConfigSchema.safeParse(raw)
    if (!parsed.success) {
      throwBffError(422, { code: 'INVALID_INPUT', message: 'La configuración no es válida.', fieldErrors: parsed.error.flatten().fieldErrors })
    }
    config = parsed.data
  }

  return { fields, files, config }
}

/** Reconstruye el multipart para el Server con lo ya validado. */
export function toServerFormData(fields: Record<string, string>, files: ValidatedImage[]): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  for (const file of files) {
    form.append(file.field, new Blob([file.data], { type: file.type }), file.filename)
  }
  return form
}
