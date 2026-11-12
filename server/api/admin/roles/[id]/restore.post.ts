import type { RoleDetail } from '#shared/schemas/roles'
import { readObjectIdParam } from '../../../../utils/request-input'
import { assertNoEscalation, loadRoleDetail } from '../../../../utils/roles'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/**
 * POST /api/admin/roles/:id/restore (Server: admin.roles.manage → POST /roles/restore/:id).
 * Un rol archivado puede conservar asignaciones antiguas: al restaurarlo vuelven a aplicar sus
 * permisos, así que deben estar todos entre los de quien restaura.
 */
export default defineEventHandler(async (event): Promise<RoleDetail> => {
  const id = readObjectIdParam(event)
  try {
    const role = await loadRoleDetail(event, id)
    if (!role.isArchived) throwBffError(409, { code: 'ROLE_NOT_ARCHIVED', message: 'El rol no está archivado.' })
    await assertNoEscalation(event, role.effectiveAllow)
    await serverApi(event, `/api/admin/security/roles/restore/${id}`, { method: 'POST' })
    return await loadRoleDetail(event, id)
  } catch (error) {
    toBffError(error)
  }
})
