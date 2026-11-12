import { MATERIAL_CATEGORIES, serverMaterialListSchema, toAdminPagination, toMaterialRow, type MaterialList } from '#shared/schemas/production'
import { parseUpstream, readListQuery } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/materials (Server: materials.read). El Server ya escapa la búsqueda. */
export default defineEventHandler(async (event): Promise<MaterialList> => {
  const { page, limit, search } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const q = getQuery(event)
  const category = (MATERIAL_CATEGORIES as readonly unknown[]).includes(q.category) ? String(q.category) : undefined
  const activeOnly = q.active === '1' ? 'true' : undefined
  try {
    const data = parseUpstream(
      serverMaterialListSchema,
      await serverApi(event, '/api/admin/production/materials', { query: { page, limit, search, category, activeOnly } }),
      'GET /admin/production/materials',
    )
    return { items: data.data.map(toMaterialRow), pagination: toAdminPagination(data.meta, limit) }
  } catch (error) {
    toBffError(error)
  }
})
