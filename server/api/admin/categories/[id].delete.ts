import { readObjectIdParam } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/**
 * DELETE /api/admin/categories/:id (Server: categories.delete).
 * El Server elimina aunque haya productos asociados (quedarían con una categoría inexistente);
 * la interfaz solo ofrece eliminar categorías sin productos.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    await serverApi(event, `/api/admin/categories/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
