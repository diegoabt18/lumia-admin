import { z } from 'zod'
import { bannerBodySchema } from '#shared/schemas/banners'
import { toServerBannerBody } from '../../../utils/banners'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/store-banners (Server: products.update). URLs restringidas a https / rutas internas. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, bannerBodySchema)
  try {
    const data = parseUpstream(
      z.object({ id: z.string() }),
      await serverApi(event, '/api/admin/store-banners', { method: 'POST', body: toServerBannerBody(input) }),
      'POST /admin/store-banners',
    )
    return { id: data.id }
  } catch (error) {
    toBffError(error)
  }
})
