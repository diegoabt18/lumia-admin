import { serverUnitEnvelopeSchema, toUnitRow, unitCreateBodySchema, type UnitRow } from '#shared/schemas/production'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/** POST /api/admin/production/units (Server: units.create; 409 si la abreviatura existe). */
export default defineEventHandler(async (event): Promise<UnitRow> => {
  const input = await readValidatedJson(event, unitCreateBodySchema)
  try {
    const { data } = parseUpstream(
      serverUnitEnvelopeSchema,
      await serverApi(event, '/api/admin/production/units', { method: 'POST', body: input }),
      'POST /admin/production/units',
    )
    return toUnitRow(data)
  } catch (error) {
    toBffError(error)
  }
})
