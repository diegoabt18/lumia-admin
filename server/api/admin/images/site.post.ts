import {
  serverSiteImagesSchema,
  SITE_IMAGE_KIND_IDS,
  SITE_IMAGE_KINDS,
  type ImageGenerationResult,
  type SiteImageKind,
} from '#shared/schemas/images'
import { parseUpstream } from '../../../utils/request-input'
import { IMAGE_GENERATION_TIMEOUT_MS, readImageUpload, toServerFormData } from '../../../utils/images'
import { serverApi } from '../../../utils/server-api'
import { throwBffError, toBffError } from '../../../utils/upstream'

const isKind = (v: string): v is SiteImageKind => (SITE_IMAGE_KIND_IDS as readonly string[]).includes(v)

/**
 * POST /api/admin/images/site (multipart: kind, index?, config, image)
 * → POST /admin/site-images/generate (Server: products.update). No guarda nada.
 */
export default defineEventHandler(async (event): Promise<ImageGenerationResult> => {
  const upload = await readImageUpload(event, { allowedFields: ['kind', 'index', 'config'], allowedFiles: { image: 1 } })
  const kind = (upload.fields.kind ?? '').trim()
  if (!isKind(kind)) throwBffError(422, { code: 'INVALID_INPUT', message: 'Tipo de imagen inválido.' })
  const meta = SITE_IMAGE_KINDS[kind]

  const fields: Record<string, string> = { kind }
  if (meta.numbered) {
    const index = Number(upload.fields.index ?? '')
    if (!Number.isInteger(index) || index < 1 || index > meta.maxIndex) {
      throwBffError(422, { code: 'INVALID_INPUT', message: `Elige una posición entre 1 y ${meta.maxIndex}.`, fieldErrors: { index: [`Entre 1 y ${meta.maxIndex}.`] } })
    }
    fields.index = String(index)
  }
  if (!upload.files.length) {
    throwBffError(422, { code: 'INVALID_INPUT', message: 'Falta la imagen.', fieldErrors: { image: ['Sube una imagen.'] } })
  }
  if (upload.config) fields.config = JSON.stringify(upload.config)

  try {
    const data = parseUpstream(
      serverSiteImagesSchema,
      await serverApi(event, '/api/admin/site-images/generate', {
        method: 'POST',
        formData: toServerFormData(fields, upload.files),
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      }),
      'POST /admin/site-images/generate',
    )
    return { imageKey: data.folder, groups: [{ label: meta.label, variants: data.variants }] }
  } catch (error) {
    toBffError(error)
  }
})
