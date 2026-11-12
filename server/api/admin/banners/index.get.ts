import { serverBannerListSchema, type BannerRow } from '#shared/schemas/banners'
import { toBannerRow } from '../../../utils/banners'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/store-banners (Server: products.read). El Server devuelve todos, sin paginar. */
export default defineEventHandler(async (event): Promise<{ items: BannerRow[] }> => {
  try {
    const data = parseUpstream(serverBannerListSchema, await serverApi(event, '/api/admin/store-banners'), 'GET /admin/store-banners')
    const now = Date.now()
    return { items: data.banners.map((b) => toBannerRow(b, now)) }
  } catch (error) {
    toBffError(error)
  }
})
