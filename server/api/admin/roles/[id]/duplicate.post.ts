import { roleDuplicateBodySchema, serverRoleEnvelopeSchema } from '#shared/schemas/roles'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { assertNoEscalation, fetchEffectiveAllow } from '../../../../utils/roles'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * POST /api/admin/roles/:id/duplicate (Server: admin.roles.manage → POST /roles/duplicate/:id).
 * La copia conserva permisos, denegaciones y herencia del original.
 */
export default defineEventHandler(async (event): Promise<{ id: string }> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, roleDuplicateBodySchema)
  try {
    await assertNoEscalation(event, await fetchEffectiveAllow(event, id))
    const { role } = parseUpstream(
      serverRoleEnvelopeSchema,
      await serverApi(event, `/api/admin/security/roles/duplicate/${id}`, { method: 'POST', body: input }),
      'POST /admin/security/roles/duplicate/:id',
    )
    return { id: role.id }
  } catch (error) {
    toBffError(error)
  }
})
