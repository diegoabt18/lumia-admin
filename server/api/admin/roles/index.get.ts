import type { RoleList } from '#shared/schemas/roles'
import { loadRoleCatalog, toRoleRow } from '../../../utils/roles'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/roles (Server: admin.roles.read). Activos y archivados, ordenados por nombre. */
export default defineEventHandler(async (event): Promise<RoleList> => {
  try {
    const catalog = await loadRoleCatalog(event)
    const items = catalog.all
      .map((r) => toRoleRow(r, catalog))
      .sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || a.name.localeCompare(b.name, 'es'))
    return { items, truncated: catalog.truncated }
  } catch (error) {
    toBffError(error)
  }
})
