import { serverUnitEnvelopeSchema, toUnitRow, unitPatchBodySchema, type UnitRow } from '#shared/schemas/production'
import { parseUpstream, readObjectIdParam } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * PATCH /api/admin/production/units/:id (Server: units.update).
 * Solo nombre, estado y orden: abreviatura, familia y factor intervienen en las conversiones de costo
 * y el Server no recalcula ni invalida su caché al cambiarlos.
 */
export default defineEventHandler(async (event): Promise<UnitRow> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, unitPatchBodySchema)
  try {
    const { data } = parseUpstream(
      serverUnitEnvelopeSchema,
      await serverApi(event, `/api/admin/production/units/${id}`, { method: 'PATCH', body: input }),
      'PATCH /admin/production/units/:id',
    )
    return toUnitRow(data)
  } catch (error) {
    toBffError(error)
  }
})
