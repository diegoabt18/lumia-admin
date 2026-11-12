import { bannerBodySchema, serverBannerDetailSchema } from '#shared/schemas/banners'
import { toServerBannerBody } from '../../../utils/banners'
import { parseUpstream, readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * Editar banner → PATCH /api/admin/store-banners/:id (Server: products.update).
 * El Server reemplaza el documento: se lee el actual para conservar `collection_slug`.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, bannerBodySchema)
  try {
    const current = parseUpstream(
      serverBannerDetailSchema,
      await serverApi(event, `/api/admin/store-banners/${id}`),
      'GET /admin/store-banners/:id',
    ).banner
    await serverApi(event, `/api/admin/store-banners/${id}`, { method: 'PATCH', body: toServerBannerBody(input, current) })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
