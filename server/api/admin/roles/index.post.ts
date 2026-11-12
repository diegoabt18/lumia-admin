import { roleCreateBodySchema, serverRoleEnvelopeSchema } from '#shared/schemas/roles'
import { parseUpstream } from '../../../utils/request-input'
import { assertNoEscalation } from '../../../utils/roles'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/** POST /api/admin/roles (Server: admin.roles.manage). Solo permisos que quien crea también tiene. */
export default defineEventHandler(async (event): Promise<{ id: string }> => {
  const input = await readValidatedJson(event, roleCreateBodySchema)
  try {
    await assertNoEscalation(event, input.permissionKeys)
    const { role } = parseUpstream(
      serverRoleEnvelopeSchema,
      await serverApi(event, '/api/admin/security/roles', {
        method: 'POST',
        body: {
          key: input.key,
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          permissionKeys: input.permissionKeys,
        },
      }),
      'POST /admin/security/roles',
    )
    return { id: role.id }
  } catch (error) {
    toBffError(error)
  }
})
