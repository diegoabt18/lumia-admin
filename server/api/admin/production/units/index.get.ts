import { serverUnitListSchema, toUnitRow, type UnitRow } from '#shared/schemas/production'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/units (Server: units.read). Catálogo completo (sin paginar en el Server). */
export default defineEventHandler(async (event): Promise<{ items: UnitRow[] }> => {
  try {
    const data = parseUpstream(serverUnitListSchema, await serverApi(event, '/api/admin/production/units'), 'GET /admin/production/units')
    return { items: data.data.map(toUnitRow) }
  } catch (error) {
    toBffError(error)
  }
})
