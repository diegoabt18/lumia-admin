import { materialCreateBodySchema, serverMaterialEnvelopeSchema } from '#shared/schemas/production'
import { assertUniqueMaterialName } from '../../../../utils/production'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/production/materials (Server: materials.create). Sin costo inicial: se registra como precio. */
export default defineEventHandler(async (event): Promise<{ id: string }> => {
  const input = await readValidatedJson(event, materialCreateBodySchema)
  try {
    await assertUniqueMaterialName(event, input.name)
    const body: Record<string, unknown> = { ...input }
    for (const key of ['code', 'description', 'imagePath'] as const) if (!input[key]) delete body[key]
    const { data } = parseUpstream(
      serverMaterialEnvelopeSchema,
      await serverApi(event, '/api/admin/production/materials', { method: 'POST', body }),
      'POST /admin/production/materials',
    )
    return { id: data.id }
  } catch (error) {
    toBffError(error)
  }
})
