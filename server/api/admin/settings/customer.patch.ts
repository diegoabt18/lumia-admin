import { customerSettingsSchema } from '#shared/schemas/settings'
import { serverApi } from '../../../utils/server-api'
import { toCustomerView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/store-customer-settings (Server: admin.access).
 * El Server hace `$set` de cualquier clave recibida: el esquema estricto solo deja pasar los
 * campos conocidos, con tipos y longitudes acotados y URLs seguras.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, customerSettingsSchema)
  try {
    return toCustomerView(await serverApi(event, '/api/admin/store-customer-settings', { method: 'PATCH', body: input }))
  } catch (error) {
    toBffError(error)
  }
})
