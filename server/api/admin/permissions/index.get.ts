import { permissionCatalogSchema, type PermissionCatalogItem } from '#shared/schemas/roles'
import { parseUpstream } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * GET /api/admin/permissions (Server: admin.permissions.read → /admin/security/permissions).
 * Catálogo de permisos desde la colección del Server. Lo usa el selector de permisos de un rol.
 */
export default defineEventHandler(async (event): Promise<{ items: PermissionCatalogItem[] }> => {
  try {
    const data = parseUpstream(
      permissionCatalogSchema,
      await serverApi(event, '/api/admin/security/permissions', { query: { limit: 200 } }),
      'GET /admin/security/permissions',
    )
    return { items: data.items.filter((item) => item.key.length > 0) }
  } catch (error) {
    toBffError(error)
  }
})
