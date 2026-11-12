import { readObjectIdParam } from '../../../../utils/request-input'
import { fetchAssociated } from '../../../../utils/recipes'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'

/**
 * DELETE /api/admin/production/recipes/:id (Server: recipes.delete).
 * El Server la borra aunque productos o variantes la tengan asignada (quedarían apuntando a una
 * receta inexistente): aquí se rechaza en ese caso.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  try {
    const associated = await fetchAssociated(event, id)
    const count = associated.products.length + associated.variants.length
    if (count > 0) {
      throwBffError(409, { code: 'RECIPE_IN_USE', message: `La usan ${count} producto(s) o variante(s). Desactívala o quita la asignación primero.` })
    }
    await serverApi(event, `/api/admin/production/recipes/${id}`, { method: 'DELETE' })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
