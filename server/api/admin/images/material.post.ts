import { PRODUCT_IMAGE_SLUG_PATTERN, serverMaterialImagesSchema, type ImageGenerationResult } from '#shared/schemas/images'
import { parseUpstream } from '../../../utils/request-input'
import { IMAGE_GENERATION_TIMEOUT_MS, readImageUpload, toServerFormData } from '../../../utils/images'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

/**
 * POST /api/admin/images/material (multipart: slug, config, image)
 * → POST /admin/production/materials/images/generate (Server: materials.update). No guarda nada.
 * El Server convierte nombres libres en slug ("Aceite de Coco" → aceite-de-coco); aquí se exige el slug ya formado.
 */
export default defineEventHandler(async (event): Promise<ImageGenerationResult> => {
  const upload = await readImageUpload(event, { allowedFields: ['slug', 'config'], allowedFiles: { image: 1 } })
  const slug = (upload.fields.slug ?? '').trim()
  if (!PRODUCT_IMAGE_SLUG_PATTERN.test(slug) || slug.length > 120) {
    throwBffError(422, { code: 'INVALID_INPUT', message: 'Slug inválido.', fieldErrors: { slug: ['Usa minúsculas, números y guiones.'] } })
  }
  if (!upload.files.length) {
    throwBffError(422, { code: 'INVALID_INPUT', message: 'Falta la imagen.', fieldErrors: { image: ['Sube una imagen.'] } })
  }
  try {
    const fields: Record<string, string> = { slug }
    if (upload.config) fields.config = JSON.stringify(upload.config)
    const data = parseUpstream(
      serverMaterialImagesSchema,
      await serverApi(event, '/api/admin/production/materials/images/generate', {
        method: 'POST',
        formData: toServerFormData(fields, upload.files),
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      }),
      'POST /admin/production/materials/images/generate',
    )
    return { imageKey: data.imageKey, groups: [{ label: 'Material', variants: data.variants }] }
  } catch (error) {
    toBffError(error)
  }
})
