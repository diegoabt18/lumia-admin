import { serverSupplierListSchema, toAdminPagination, toSupplierRow, type SupplierList } from '#shared/schemas/production'
import { parseUpstream, readListQuery } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/suppliers (Server: suppliers.read). `active=1` solo activos. */
export default defineEventHandler(async (event): Promise<SupplierList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100, 200], escapeSearch: false })
  const activeOnly = getQuery(event).active === '1' ? 'true' : undefined
  try {
    const data = parseUpstream(
      serverSupplierListSchema,
      await serverApi(event, '/api/admin/production/suppliers', { query: { page, limit, search, activeOnly } }),
      'GET /admin/production/suppliers',
    )
    return { items: data.data.map(toSupplierRow), pagination: toAdminPagination(data.meta, limit) }
  } catch (error) {
    toBffError(error)
  }
})
