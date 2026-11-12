import {
  IMAGE_MAX_GALLERY,
  PRODUCT_IMAGE_SLUG_PATTERN,
  serverProductImagesSchema,
  type ImageGenerationResult,
} from '#shared/schemas/images'
import { parseUpstream } from '../../../utils/request-input'
import { IMAGE_GENERATION_TIMEOUT_MS, readImageUpload, toServerFormData } from '../../../utils/images'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

/**
 * POST /api/admin/images/product (multipart: slug, config, main, gallery[])
 * → POST /admin/product-images/generate (Server: products.update). No guarda nada.
 */
export default defineEventHandler(async (event): Promise<ImageGenerationResult> => {
  const upload = await readImageUpload(event, {
    allowedFields: ['slug', 'config'],
    allowedFiles: { main: 1, gallery: IMAGE_MAX_GALLERY },
  })
  const slug = (upload.fields.slug ?? '').trim()
  if (!PRODUCT_IMAGE_SLUG_PATTERN.test(slug) || slug.length > 120) {
    throwBffError(422, { code: 'INVALID_INPUT', message: 'Slug inválido.', fieldErrors: { slug: ['Usa minúsculas, números y guiones.'] } })
  }
  if (!upload.files.some((f) => f.field === 'main')) {
    throwBffError(422, { code: 'INVALID_INPUT', message: 'Falta la imagen principal.', fieldErrors: { main: ['Sube la imagen principal.'] } })
  }
  // Orden estable: principal primero, galería en el orden recibido.
  const files = [...upload.files.filter((f) => f.field === 'main'), ...upload.files.filter((f) => f.field === 'gallery')]

  try {
    const fields: Record<string, string> = { slug }
    if (upload.config) fields.config = JSON.stringify(upload.config)
    const data = parseUpstream(
      serverProductImagesSchema,
      await serverApi(event, '/api/admin/product-images/generate', {
        method: 'POST',
        formData: toServerFormData(fields, files),
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      }),
      'POST /admin/product-images/generate',
    )
    return {
      imageKey: data.imageKey,
      groups: [
        { label: 'Imagen principal', variants: data.main },
        ...data.gallery.map((variants, i) => ({ label: `Galería ${i + 1}`, variants })),
      ],
    }
  } catch (error) {
    toBffError(error)
  }
})
