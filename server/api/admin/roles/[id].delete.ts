import { readObjectIdParam } from '../../../utils/request-input'
import { assertRoleDetachable, loadRoleDetail } from '../../../utils/roles'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * DELETE /api/admin/roles/:id (Server: admin.roles.manage).
 * El Server no borra las asignaciones: solo se permite sin usuarios y sin roles que hereden de él.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    assertRoleDetachable(await loadRoleDetail(event, id), 'delete')
    await serverApi(event, `/api/admin/security/roles/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
